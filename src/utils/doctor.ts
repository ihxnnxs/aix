import * as jsonc from "jsonc-parser"
import * as TOML from "smol-toml"
import { chmodSync, existsSync, statSync } from "node:fs"
import { basename, delimiter, isAbsolute, join } from "node:path"
import type { CLIDef } from "../adapters/detector"
import { getAllCLIDefs } from "../adapters/detector"
import { GenericMCPAdapter } from "../adapters/generic"
import type { ConfigScope, MCPServer } from "../adapters/types"
import { createMCPServer } from "../adapters/types"
import { VERSION } from "../version"
import type { UpdateInfo } from "./update"

export type DoctorSeverity = "warning" | "error" | "security"

export interface DoctorDiagnostic {
  id: string
  severity: DoctorSeverity
  toolId: string
  toolName: string
  message: string
  scope?: ConfigScope
  path?: string
  serverName?: string
  fixable?: boolean
  fixed?: boolean
  details?: Record<string, unknown>
}

export interface DoctorConfigReport {
  path: string
  scope: ConfigScope
  format: "json" | "toml"
  keyPath: string
  parseOk: boolean
  serverCount: number
}

export interface DoctorToolReport {
  id: string
  name: string
  icon: string
  installed: boolean
  configPath: string | null
  configs: DoctorConfigReport[]
  counts: {
    mcp: number
    rules: number
    skills: number
    agents: number
  }
  diagnosticCount: number
}

export interface DoctorReport {
  version: string
  projectRoot: string | null
  update: UpdateInfo | null
  system: {
    bun: string
    platform: NodeJS.Platform
    arch: NodeJS.Architecture
  }
  totals: {
    tools: number
    detected: number
    configs: number
    mcpServers: number
    diagnostics: number
    warnings: number
    errors: number
    security: number
    fixed: number
  }
  tools: DoctorToolReport[]
  diagnostics: DoctorDiagnostic[]
}

export interface DoctorOptions {
  projectRoot: string | null
  update?: UpdateInfo | null
  fix?: boolean
}

interface ConfigLocation {
  path: string
  scope: ConfigScope
  keyPath: string
  format: "json" | "toml"
}

interface ParsedConfig {
  value: unknown
  error?: string
}

const SECRET_KEY_PATTERN = /(token|secret|password|passwd|api[_-]?key|auth|credential|bearer|private[_-]?key)/i
const SUSPICIOUS_VALUE_PATTERN = /(ghp_|github_pat_|sk-[A-Za-z0-9]|xox[baprs]-|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/
const SHELL_COMMANDS = new Set(["bash", "sh", "zsh", "fish", "cmd", "powershell", "pwsh"])
const PACKAGE_LAUNCHERS = new Set(["npx", "bunx", "uvx", "pipx"])
const INLINE_CODE_FLAGS = new Set(["-c", "/c", "-command", "-encodedcommand"])
const SHELL_META_PATTERN = /[;&|`<>]|\$\(|\r|\n/

export async function collectDoctorReport(options: DoctorOptions): Promise<DoctorReport> {
  const diagnostics: DoctorDiagnostic[] = []
  const tools: DoctorToolReport[] = []

  for (const def of getAllCLIDefs()) {
    const adapter = new GenericMCPAdapter(def, options.projectRoot)
    const detection = await adapter.detect()
    const configs: DoctorConfigReport[] = []
    const servers: MCPServer[] = []
    const toolDiagnosticsStart = diagnostics.length

    for (const location of existingConfigLocations(def, options.projectRoot)) {
      let text: string
      try {
        text = await Bun.file(location.path).text()
      } catch (error) {
        configs.push({
          path: location.path,
          scope: location.scope,
          format: location.format,
          keyPath: location.keyPath,
          parseOk: false,
          serverCount: 0,
        })
        diagnostics.push(diagnostic(def, "config-read-error", "error", "Cannot read config file", location, undefined, {
          error: error instanceof Error ? error.message : String(error),
        }))
        continue
      }

      const parsed = parseConfig(text, location.format)
      const configReport: DoctorConfigReport = {
        path: location.path,
        scope: location.scope,
        format: location.format,
        keyPath: location.keyPath,
        parseOk: !parsed.error,
        serverCount: 0,
      }
      configs.push(configReport)

      if (parsed.error) {
        diagnostics.push(diagnostic(def, "config-parse-error", "error", `Cannot parse ${location.format.toUpperCase()} config`, location, undefined, {
          error: parsed.error,
        }))
        continue
      }

      const mcpMap = valueAtPath(parsed.value, location.keyPath)
      if (mcpMap === undefined) {
        diagnostics.push(diagnostic(def, "empty-mcp-config", "warning", `Config has no ${location.keyPath} entries`, location))
        continue
      }

      if (!isPlainObject(mcpMap)) {
        diagnostics.push(diagnostic(def, "invalid-mcp-map", "error", `${location.keyPath} must be an object`, location))
        continue
      }

      const entries = Object.entries(mcpMap)
      configReport.serverCount = entries.length
      if (entries.length === 0) {
        diagnostics.push(diagnostic(def, "empty-mcp-config", "warning", `Config has empty ${location.keyPath}`, location))
        continue
      }

      const configServers: MCPServer[] = []
      for (const [name, raw] of entries) {
        if (!isPlainObject(raw)) {
          diagnostics.push(diagnostic(def, "invalid-mcp-server", "error", `MCP server "${name}" must be an object`, location, name))
          continue
        }
        const server = createMCPServer(name, raw, def.id, location.scope)
        configServers.push(server)
        validateServer(def, location, server, raw, diagnostics)
      }
      servers.push(...configServers)
      validateConfigFilePermissions(def, location, configServers, diagnostics, !!options.fix)
    }

    validateDuplicateServers(def, servers, diagnostics)

    const [rules, skills, agents] = await Promise.all([
      adapter.getRulesFiles().catch(() => []),
      adapter.getSkillFiles().catch(() => []),
      adapter.getAgentFiles().catch(() => []),
    ])

    const counts = {
      mcp: servers.length,
      rules: rules.length,
      skills: skills.length,
      agents: agents.length,
    }

    tools.push({
      id: def.id,
      name: def.name,
      icon: def.icon,
      installed: detection.installed || configs.length > 0,
      configPath: detection.configPath,
      configs,
      counts,
      diagnosticCount: diagnostics.length - toolDiagnosticsStart,
    })
  }

  return {
    version: VERSION,
    projectRoot: options.projectRoot,
    update: options.update ?? null,
    system: {
      bun: Bun.version,
      platform: process.platform,
      arch: process.arch,
    },
    totals: buildTotals(tools, diagnostics),
    tools,
    diagnostics,
  }
}

function existingConfigLocations(def: CLIDef, projectRoot: string | null): ConfigLocation[] {
  const locations: ConfigLocation[] = []
  const seen = new Set<string>()
  const format = def.configFormat ?? "json"

  for (const path of def.paths()) {
    if (!existsSync(path) || seen.has(`global:${path}`)) continue
    seen.add(`global:${path}`)
    locations.push({ path, scope: "global", keyPath: def.serverKey ?? "mcpServers", format })
  }

  if (projectRoot && def.projectPaths) {
    for (const path of def.projectPaths(projectRoot)) {
      if (!existsSync(path) || seen.has(`project:${path}`)) continue
      seen.add(`project:${path}`)
      locations.push({ path, scope: "project", keyPath: def.projectServerKey ?? def.serverKey ?? "mcpServers", format })
    }
  }

  return locations
}

function parseConfig(text: string, format: "json" | "toml"): ParsedConfig {
  if (!text.trim()) return { value: {} }
  try {
    if (format === "toml") return { value: TOML.parse(text) }
    const errors: jsonc.ParseError[] = []
    const value = jsonc.parse(text, errors, { allowTrailingComma: true })
    if (errors.length > 0) {
      const first = errors[0]
      return { value, error: `${jsonc.printParseErrorCode(first.error)} at offset ${first.offset}` }
    }
    return { value }
  } catch (error) {
    return { value: undefined, error: error instanceof Error ? error.message : String(error) }
  }
}

function valueAtPath(value: unknown, keyPath: string): unknown {
  let current = value
  for (const key of keyPath.split(".")) {
    if (!isPlainObject(current)) return undefined
    current = current[key]
  }
  return current
}

function validateServer(
  def: CLIDef,
  location: ConfigLocation,
  server: MCPServer,
  raw: Record<string, unknown>,
  diagnostics: DoctorDiagnostic[],
): void {
  const command = raw.command
  const args = raw.args
  const url = raw.url
  const env = raw.env
  const headers = raw.headers

  if (command === undefined && url === undefined) {
    diagnostics.push(diagnostic(def, "missing-transport", "error", "MCP server must define either command or url", location, server.name))
  }

  if (command !== undefined && typeof command !== "string" && !Array.isArray(command)) {
    diagnostics.push(diagnostic(def, "invalid-command", "error", "command must be a string or string array", location, server.name))
  }

  if (Array.isArray(command) && command.some((part) => typeof part !== "string")) {
    diagnostics.push(diagnostic(def, "invalid-command-array", "error", "command array must contain only strings", location, server.name))
  }

  if (args !== undefined && (!Array.isArray(args) || args.some((part) => typeof part !== "string"))) {
    diagnostics.push(diagnostic(def, "invalid-args", "error", "args must be an array of strings", location, server.name))
  }

  if (url !== undefined && typeof url !== "string") {
    diagnostics.push(diagnostic(def, "invalid-url", "error", "url must be a string", location, server.name))
  }

  if (env !== undefined && !isStringMap(env)) {
    diagnostics.push(diagnostic(def, "invalid-env", "error", "env must be an object with string values", location, server.name))
  }

  if (headers !== undefined && !isStringMap(headers)) {
    diagnostics.push(diagnostic(def, "invalid-headers", "error", "headers must be an object with string values", location, server.name))
  }

  if (server.command) validateCommand(def, location, server, diagnostics)
  if (server.url) validateUrl(def, location, server, diagnostics)
  validateSecretKeys(def, location, server, env, headers, diagnostics)
  validateSecretLikeValues(def, location, server, raw, diagnostics)
}

function validateCommand(def: CLIDef, location: ConfigLocation, server: MCPServer, diagnostics: DoctorDiagnostic[]): void {
  const command = server.command
  if (!command) return

  const commandName = normalizeCommandName(command)
  const args = server.args ?? []
  const lowerArgs = args.map((arg) => arg.toLowerCase())

  if (server.url) {
    diagnostics.push(diagnostic(def, "mixed-transport", "warning", "Server defines both command and url; confirm the target tool supports this shape", location, server.name))
  }

  if (SHELL_COMMANDS.has(commandName) && lowerArgs.some((arg) => INLINE_CODE_FLAGS.has(arg))) {
    diagnostics.push(diagnostic(def, "shell-inline-command", "security", "Server runs through a shell inline command; review it before transferring", location, server.name))
  }

  if (PACKAGE_LAUNCHERS.has(commandName)) {
    diagnostics.push(diagnostic(def, "package-launcher", "warning", "Server uses a package launcher that may download or execute remote code", location, server.name, {
      command: commandName,
    }))
  }

  if (command.startsWith(".")) {
    diagnostics.push(diagnostic(def, "relative-command", "warning", "Server command is relative and depends on the current working directory", location, server.name))
  }

  const argsContainShellMeta = args.some(containsShellMeta)
  if (containsShellMeta(command) || (SHELL_COMMANDS.has(commandName) && argsContainShellMeta)) {
    diagnostics.push(diagnostic(def, "shell-metacharacters", "security", "Command or args contain shell metacharacters; review for command injection risk", location, server.name))
  } else if (argsContainShellMeta) {
    diagnostics.push(diagnostic(def, "suspicious-args", "warning", "Args contain shell metacharacters; safe as argv but review if the server invokes a shell", location, server.name))
  }

  const exists = commandExists(command)
  if (exists === false) {
    diagnostics.push(diagnostic(def, isPathLike(command) ? "missing-command-path" : "command-not-found", isPathLike(command) ? "error" : "warning", isPathLike(command) ? "Command path does not exist" : "Command was not found on PATH", location, server.name, {
      command: commandName,
    }))
  }
}

function validateUrl(def: CLIDef, location: ConfigLocation, server: MCPServer, diagnostics: DoctorDiagnostic[]): void {
  if (!server.url) return
  let parsed: URL
  try {
    parsed = new URL(server.url)
  } catch {
    diagnostics.push(diagnostic(def, "invalid-url", "error", "url is not a valid URL", location, server.name))
    return
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    diagnostics.push(diagnostic(def, "unsupported-url-protocol", "error", "MCP url must use http or https", location, server.name, {
      protocol: parsed.protocol,
    }))
  }

  if (parsed.protocol === "http:" && !isLocalHost(parsed.hostname)) {
    diagnostics.push(diagnostic(def, "insecure-remote-url", "security", "Remote MCP url uses plain HTTP instead of HTTPS", location, server.name, {
      host: parsed.hostname,
    }))
  }

  if (parsed.username || parsed.password) {
    diagnostics.push(diagnostic(def, "url-credentials", "security", "MCP url embeds credentials", location, server.name))
  }

  const secretQueryKeys = [...parsed.searchParams.keys()].filter((key) => SECRET_KEY_PATTERN.test(key))
  if (secretQueryKeys.length > 0) {
    diagnostics.push(diagnostic(def, "secret-url-query", "security", "MCP url contains secret-like query parameters", location, server.name, {
      keys: secretQueryKeys.sort(),
    }))
  }
}

function validateSecretKeys(
  def: CLIDef,
  location: ConfigLocation,
  server: MCPServer,
  env: unknown,
  headers: unknown,
  diagnostics: DoctorDiagnostic[],
): void {
  if (isPlainObject(env)) {
    const keys = Object.keys(env).filter((key) => SECRET_KEY_PATTERN.test(key)).sort()
    if (keys.length > 0) {
      diagnostics.push(diagnostic(def, "secret-env-keys", "security", "Server env contains sensitive keys; doctor output redacts their values", location, server.name, { keys }))
    }
  }

  if (isPlainObject(headers)) {
    const keys = Object.keys(headers).filter((key) => SECRET_KEY_PATTERN.test(key)).sort()
    if (keys.length > 0) {
      diagnostics.push(diagnostic(def, "secret-header-keys", "security", "Server headers contain sensitive keys; doctor output redacts their values", location, server.name, { keys }))
    }
  }
}

function validateSecretLikeValues(
  def: CLIDef,
  location: ConfigLocation,
  server: MCPServer,
  raw: Record<string, unknown>,
  diagnostics: DoctorDiagnostic[],
): void {
  const fields = [raw.command, ...(Array.isArray(raw.args) ? raw.args : []), raw.url]
    .filter((value): value is string => typeof value === "string")
  if (fields.some((value) => SUSPICIOUS_VALUE_PATTERN.test(value))) {
    diagnostics.push(diagnostic(def, "inline-secret-value", "security", "Command, args, or url appear to contain an inline secret", location, server.name))
  }
}

function validateConfigFilePermissions(
  def: CLIDef,
  location: ConfigLocation,
  servers: MCPServer[],
  diagnostics: DoctorDiagnostic[],
  fix: boolean,
): void {
  if (process.platform === "win32") return
  if (!servers.some(hasSecretMaterial)) return

  try {
    const mode = statSync(location.path).mode & 0o777
    if ((mode & 0o077) === 0) return

    const item = diagnostic(def, "secret-file-permissions", "security", "Config contains secrets and is readable or writable by group/others", location, undefined, {
      mode: `0${mode.toString(8)}`,
      expected: "0600",
    })
    item.fixable = true

    if (fix) {
      chmodSync(location.path, 0o600)
      item.fixed = true
    }

    diagnostics.push(item)
  } catch (error) {
    diagnostics.push(diagnostic(def, "permission-check-failed", "warning", "Could not inspect config file permissions", location, undefined, {
      error: error instanceof Error ? error.message : String(error),
    }))
  }
}

function validateDuplicateServers(def: CLIDef, servers: MCPServer[], diagnostics: DoctorDiagnostic[]): void {
  const byName = new Map<string, MCPServer[]>()
  for (const server of servers) {
    const list = byName.get(server.name) ?? []
    list.push(server)
    byName.set(server.name, list)
  }

  for (const [name, list] of byName.entries()) {
    if (list.length < 2) continue
    diagnostics.push({
      id: "duplicate-server-name",
      severity: "warning",
      toolId: def.id,
      toolName: def.name,
      serverName: name,
      message: "MCP server name is duplicated across config scopes or files",
      details: {
        scopes: list.map((server) => server._scope),
      },
    })
  }
}

function hasSecretMaterial(server: MCPServer): boolean {
  return isPlainObject(server.env) || isPlainObject(server.headers) || (!!server.url && hasSecretUrl(server.url))
}

function hasSecretUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return !!parsed.username || !!parsed.password || [...parsed.searchParams.keys()].some((key) => SECRET_KEY_PATTERN.test(key))
  } catch {
    return false
  }
}

function diagnostic(
  def: CLIDef,
  id: string,
  severity: DoctorSeverity,
  message: string,
  location: ConfigLocation,
  serverName?: string,
  details?: Record<string, unknown>,
): DoctorDiagnostic {
  return {
    id,
    severity,
    toolId: def.id,
    toolName: def.name,
    scope: location.scope,
    path: location.path,
    serverName,
    message,
    details,
  }
}

function buildTotals(tools: DoctorToolReport[], diagnostics: DoctorDiagnostic[]): DoctorReport["totals"] {
  return {
    tools: tools.length,
    detected: tools.filter((tool) => tool.installed).length,
    configs: tools.reduce((sum, tool) => sum + tool.configs.length, 0),
    mcpServers: tools.reduce((sum, tool) => sum + tool.counts.mcp, 0),
    diagnostics: diagnostics.length,
    warnings: diagnostics.filter((item) => item.severity === "warning").length,
    errors: diagnostics.filter((item) => item.severity === "error").length,
    security: diagnostics.filter((item) => item.severity === "security").length,
    fixed: diagnostics.filter((item) => item.fixed).length,
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isPlainObject(value) && Object.values(value).every((item) => typeof item === "string")
}

function normalizeCommandName(command: string): string {
  return basename(command).replace(/\.exe$/i, "").toLowerCase()
}

function containsShellMeta(value: string): boolean {
  return SHELL_META_PATTERN.test(value)
}

function isPathLike(command: string): boolean {
  return command.includes("/") || command.includes("\\") || command.startsWith(".")
}

function commandExists(command: string): boolean | null {
  if (isPathLike(command) || isAbsolute(command)) return existsSync(command)
  const path = process.env.PATH
  if (!path) return null
  const exts = process.platform === "win32"
    ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")
    : [""]

  for (const dir of path.split(delimiter)) {
    for (const ext of exts) {
      if (existsSync(join(dir, command + ext.toLowerCase())) || existsSync(join(dir, command + ext.toUpperCase()))) return true
    }
  }
  return false
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".localhost")
}
