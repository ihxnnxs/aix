import * as jsonc from "jsonc-parser"
import * as TOML from "smol-toml"
import { existsSync } from "node:fs"
import type { Adapter, AdapterCapabilities, DetectResult, MCPServer, RulesFile, SkillFile } from "./types"
import { createMCPServer } from "./types"
import type { CLIDef } from "./detector"

export class GenericMCPAdapter implements Adapter {
  id: string
  name: string
  icon: string
  hasProjectScope: boolean
  capabilities: AdapterCapabilities = {
    mcp: true,
    skills: false,
    rules: false,
  }

  private def: CLIDef
  private projectRoot: string | null
  private globalConfigPath: string | null = null
  private projectConfigPath: string | null = null

  constructor(def: CLIDef, projectRoot?: string | null) {
    this.def = def
    this.id = def.id
    this.name = def.name
    this.icon = def.icon
    this.projectRoot = projectRoot ?? null
    this.hasProjectScope = !!def.projectPaths && !!this.projectRoot
  }

  async detect(): Promise<DetectResult> {
    for (const p of this.def.paths()) {
      if (existsSync(p)) {
        this.globalConfigPath = p
        break
      }
    }
    if (this.projectRoot && this.def.projectPaths) {
      for (const p of this.def.projectPaths(this.projectRoot)) {
        if (existsSync(p)) {
          this.projectConfigPath = p
          break
        }
      }
    }
    const installed = !!this.globalConfigPath || !!this.projectConfigPath
    return {
      installed,
      configPath: this.globalConfigPath ?? this.projectConfigPath ?? null,
    }
  }

  async getMCPServers(scope: "global" | "project" | "all" = "all"): Promise<MCPServer[]> {
    const servers: MCPServer[] = []
    if (scope === "global" || scope === "all") {
      servers.push(...await this.readServers("global"))
    }
    if (scope === "project" || scope === "all") {
      servers.push(...await this.readServers("project"))
    }
    return servers
  }

  async writeMCPServer(server: MCPServer, scope: "global" | "project" = "global"): Promise<void> {
    const path = this.getWritePath(scope)
    if (!path) throw new Error(`${this.name} does not support ${scope} scope`)
    const keyPath = this.getServerKey(scope)

    if (this.def.configFormat === "toml") {
      let text = await this.readFile(path) ?? ""
      const parsed = text ? TOML.parse(text) : {} as any
      const keys = keyPath.split(".")
      let obj: any = parsed
      for (const k of keys) {
        obj[k] = obj[k] ?? {}
        obj = obj[k]
      }
      obj[server.name] = server._raw
      await Bun.write(path, TOML.stringify(parsed))
    } else {
      let text = await this.readFile(path) ?? "{}"
      const keys = [...keyPath.split("."), server.name]
      const edits = jsonc.modify(text, keys, server._raw, {})
      text = jsonc.applyEdits(text, edits)
      await Bun.write(path, text)
    }
  }

  async removeMCPServer(name: string, scope: "global" | "project" = "global"): Promise<void> {
    const path = this.getWritePath(scope)
    if (!path) return
    const text = await this.readFile(path)
    if (!text) return
    const keyPath = this.getServerKey(scope)

    if (this.def.configFormat === "toml") {
      const parsed = TOML.parse(text) as any
      const keys = keyPath.split(".")
      let obj: any = parsed
      for (const k of keys) {
        obj = obj?.[k]
      }
      if (obj) delete obj[name]
      await Bun.write(path, TOML.stringify(parsed))
    } else {
      const keys = [...keyPath.split("."), name]
      const edits = jsonc.modify(text, keys, undefined, {})
      const updated = jsonc.applyEdits(text, edits)
      await Bun.write(path, updated)
    }
  }

  async getRulesFiles(scope: "global" | "project" | "all" = "all"): Promise<RulesFile[]> {
    const files: RulesFile[] = []
    if (scope === "global" || scope === "all") {
      files.push(...await this.scanRules("global"))
    }
    if (scope === "project" || scope === "all") {
      files.push(...await this.scanRules("project"))
    }
    return files
  }

  async getSkillFiles(scope: "global" | "project" | "all" = "all"): Promise<SkillFile[]> {
    const files: SkillFile[] = []
    if (scope === "global" || scope === "all") {
      files.push(...await this.scanSkills("global"))
    }
    if (scope === "project" || scope === "all") {
      files.push(...await this.scanSkills("project"))
    }
    return files
  }

  async writeSkillFile(content: string, targetPath: string): Promise<void> {
    const { mkdirSync } = await import("node:fs")
    const { dirname } = await import("node:path")
    mkdirSync(dirname(targetPath), { recursive: true })
    await Bun.write(targetPath, content)
  }

  async writeRulesFile(content: string, targetPath: string): Promise<void> {
    const { mkdirSync } = await import("node:fs")
    const { dirname } = await import("node:path")
    mkdirSync(dirname(targetPath), { recursive: true })
    await Bun.write(targetPath, content)
  }

  private async scanRules(scope: "global" | "project"): Promise<RulesFile[]> {
    const paths = scope === "global"
      ? this.def.rulesPath?.() ?? []
      : (this.projectRoot && this.def.projectRulesPath)
        ? this.def.projectRulesPath(this.projectRoot)
        : []

    const files: RulesFile[] = []
    const { existsSync, readdirSync, statSync } = await import("node:fs")
    const { join, basename } = await import("node:path")

    for (const p of paths) {
      if (!existsSync(p)) continue

      const stat = statSync(p)
      if (stat.isDirectory()) {
        // Scan directory for .md/.mdc files
        try {
          const entries = readdirSync(p)
          for (const entry of entries) {
            if (!entry.endsWith(".md") && !entry.endsWith(".mdc")) continue
            const filePath = join(p, entry)
            const content = await Bun.file(filePath).text()
            files.push({
              name: entry,
              path: filePath,
              content,
              lines: content.split("\n").length,
              _source: this.id,
              _scope: scope,
            })
          }
        } catch {}
      } else {
        // Single file
        try {
          const content = await Bun.file(p).text()
          files.push({
            name: basename(p),
            path: p,
            content,
            lines: content.split("\n").length,
            _source: this.id,
            _scope: scope,
          })
        } catch {}
      }
    }
    return files
  }

  private async scanSkills(scope: "global" | "project"): Promise<SkillFile[]> {
    const paths = scope === "global"
      ? this.def.skillsPath?.() ?? []
      : (this.projectRoot && this.def.projectSkillsPath)
        ? this.def.projectSkillsPath(this.projectRoot)
        : []

    const files: SkillFile[] = []
    const { existsSync, readdirSync, statSync, readlinkSync } = await import("node:fs")
    const { join, resolve, dirname } = await import("node:path")

    for (const p of paths) {
      if (!existsSync(p)) continue

      const stat = statSync(p)
      if (!stat.isDirectory()) continue

      try {
        const entries = readdirSync(p)
        for (const entry of entries) {
          const entryPath = join(p, entry)
          let resolvedPath = entryPath

          // Resolve symlinks
          try {
            const lstat = statSync(entryPath, { throwIfNoEntry: false } as any)
            if (!lstat) continue
            const realStat = statSync(entryPath)
            if (realStat.isSymbolicLink?.() || statSync(entryPath).isDirectory()) {
              // Check for SKILL.md inside directory
              const skillFile = join(entryPath, "SKILL.md")
              if (existsSync(skillFile)) {
                const content = await Bun.file(skillFile).text()
                const description = this.parseSkillDescription(content)
                files.push({
                  name: entry,
                  path: skillFile,
                  content,
                  lines: content.split("\n").length,
                  description,
                  _source: this.id,
                  _scope: scope,
                })
                continue
              }
            }
          } catch {}

          // Fallback: direct .md/.mdc files
          if (entry.endsWith(".md") || entry.endsWith(".mdc")) {
            try {
              const content = await Bun.file(entryPath).text()
              const description = this.parseSkillDescription(content)
              files.push({
                name: entry,
                path: entryPath,
                content,
                lines: content.split("\n").length,
                description,
                _source: this.id,
                _scope: scope,
              })
            } catch {}
          }
        }
      } catch {}
    }
    return files
  }

  private parseSkillDescription(content: string): string | undefined {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/)
    if (!match) return undefined
    const frontmatter = match[1]
    const descLine = frontmatter.match(/^description:\s*(.+)$/m)
    const raw = descLine?.[1]?.trim()
    if (!raw) return undefined
    return raw.replace(/^["']|["']$/g, "")
  }

  private parseConfig(text: string): any {
    if (this.def.configFormat === "toml") return TOML.parse(text)
    return jsonc.parse(text)
  }

  private async readServers(scope: "global" | "project"): Promise<MCPServer[]> {
    const path = scope === "global" ? this.globalConfigPath : this.projectConfigPath
    if (!path) return []
    const text = await this.readFile(path)
    if (!text) return []
    const parsed = this.parseConfig(text)
    const keyPath = this.getServerKey(scope)
    const keys = keyPath.split(".")
    let obj: any = parsed
    for (const k of keys) {
      obj = obj?.[k]
    }
    if (!obj || typeof obj !== "object") return []
    return Object.entries(obj).map(([name, raw]) =>
      createMCPServer(name, raw as Record<string, unknown>, this.id, scope),
    )
  }

  private getServerKey(scope: "global" | "project"): string {
    if (scope === "project" && this.def.projectServerKey) return this.def.projectServerKey
    return this.def.serverKey ?? "mcpServers"
  }

  private getWritePath(scope: "global" | "project"): string | null {
    if (scope === "global") {
      return this.globalConfigPath ?? this.def.paths()[0]
    }
    if (!this.projectRoot || !this.def.projectPaths) return null
    return this.projectConfigPath ?? this.def.projectPaths(this.projectRoot)[0]
  }

  private async readFile(path: string): Promise<string | null> {
    const file = Bun.file(path)
    if (!(await file.exists())) return null
    return file.text()
  }
}
