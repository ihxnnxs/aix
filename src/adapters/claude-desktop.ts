import * as jsonc from "jsonc-parser"
import { existsSync } from "node:fs"
import type { Adapter, AdapterCapabilities, DetectResult, MCPServer, RulesFile, SkillFile } from "./types"
import { createMCPServer } from "./types"
import { getConfigPaths } from "./detector"

export class ClaudeDesktopAdapter implements Adapter {
  id = "claude-desktop"
  name = "Claude Desktop"
  icon = "CD"
  hasProjectScope = false
  capabilities: AdapterCapabilities = {
    mcp: true,
    skills: false,
    rules: false,
    scopes: ["user"],
  }

  private configPath: string

  constructor(configPath?: string) {
    this.configPath = configPath ?? getConfigPaths("claude-desktop")[0]
  }

  async detect(): Promise<DetectResult> {
    const installed = existsSync(this.configPath)
    return {
      installed,
      configPath: installed ? this.configPath : null,
    }
  }

  async getMCPServers(): Promise<MCPServer[]> {
    const text = await this.readConfig()
    if (!text) return []

    const parsed = jsonc.parse(text)
    const servers = parsed?.mcpServers
    if (!servers || typeof servers !== "object") return []

    return Object.entries(servers).map(([name, raw]) =>
      createMCPServer(name, raw as Record<string, unknown>, this.id),
    )
  }

  async writeMCPServer(server: MCPServer): Promise<void> {
    let text = (await this.readConfig()) ?? "{}"
    const edits = jsonc.modify(text, ["mcpServers", server.name], server._raw, {})
    text = jsonc.applyEdits(text, edits)
    await Bun.write(this.configPath, text)
  }

  async removeMCPServer(name: string): Promise<void> {
    const text = await this.readConfig()
    if (!text) return

    const edits = jsonc.modify(text, ["mcpServers", name], undefined, {})
    const updated = jsonc.applyEdits(text, edits)
    await Bun.write(this.configPath, updated)
  }

  async getRulesFiles(): Promise<RulesFile[]> { return [] }
  async writeRulesFile(): Promise<void> {}
  async getSkillFiles(): Promise<SkillFile[]> { return [] }
  async writeSkillFile(): Promise<void> {}

  private async readConfig(): Promise<string | null> {
    const file = Bun.file(this.configPath)
    if (!(await file.exists())) return null
    return file.text()
  }
}
