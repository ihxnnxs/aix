export interface MCPServer {
  name: string
  transport: "stdio" | "http" | "sse"
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
  _raw: Record<string, unknown>
  _source: string
  _scope: "global" | "project"
}

export interface RulesFile {
  name: string
  path: string
  content: string
  lines: number
  _source: string
  _scope: "global" | "project"
}

export interface SkillFile {
  name: string
  path: string
  content: string
  lines: number
  description?: string
  _source: string
  _scope: "global" | "project"
}

export interface DetectResult {
  installed: boolean
  configPath: string | null
  version?: string
}

export interface AdapterCapabilities {
  mcp: boolean
  skills: boolean
  rules: boolean
  scopes?: ("user" | "project")[]
}

export interface Adapter {
  id: string
  name: string
  icon: string
  capabilities: AdapterCapabilities
  hasProjectScope: boolean

  detect(): Promise<DetectResult>
  getMCPServers(): Promise<MCPServer[]>
  writeMCPServer(server: MCPServer): Promise<void>
  removeMCPServer(name: string): Promise<void>
  getRulesFiles(scope?: "global" | "project" | "all"): Promise<RulesFile[]>
  writeRulesFile(content: string, targetPath: string): Promise<void>
  getSkillFiles(scope?: "global" | "project" | "all"): Promise<SkillFile[]>
  writeSkillFile(content: string, targetPath: string): Promise<void>
}

export function createMCPServer(
  name: string,
  raw: Record<string, unknown>,
  source: string,
  scope: "global" | "project" = "global",
): MCPServer {
  const hasUrl = typeof raw.url === "string"
  const transport: MCPServer["transport"] = hasUrl ? "http" : "stdio"

  return {
    name,
    transport,
    command: typeof raw.command === "string"
      ? raw.command
      : Array.isArray(raw.command) ? raw.command[0] : undefined,
    args: Array.isArray(raw.args)
      ? raw.args
      : Array.isArray(raw.command) ? raw.command.slice(1) : undefined,
    env: raw.env as Record<string, string> | undefined,
    url: typeof raw.url === "string" ? raw.url : undefined,
    headers: raw.headers as Record<string, string> | undefined,
    _raw: raw,
    _source: source,
    _scope: scope,
  }
}
