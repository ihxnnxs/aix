import { existsSync } from "node:fs"
import { join } from "node:path"
import { homedir, platform } from "node:os"
import type { DetectResult } from "./types"

export interface CLIDef {
  id: string
  name: string
  icon: string
  paths: () => string[]
  serverKey?: string // dot-separated JSON path, default "mcpServers"
  configFormat?: "json" | "toml" // default "json"
  projectPaths?: (root: string) => string[]
  projectServerKey?: string
  rulesPath?: () => string[]
  projectRulesPath?: (root: string) => string[]
  skillsPath?: () => string[]
  projectSkillsPath?: (root: string) => string[]
  agentsPath?: () => string[]
  projectAgentsPath?: (root: string) => string[]
}

const home = homedir()
const os = platform()

function appDataDir(): string {
  if (os === "darwin") return join(home, "Library", "Application Support")
  if (os === "win32") return process.env.APPDATA ?? join(home, "AppData", "Roaming")
  return process.env.XDG_CONFIG_HOME ?? join(home, ".config")
}

function vscodeGlobalStorage(extensionId: string): string[] {
  const base = appDataDir()
  return [
    join(base, "Code", "User", "globalStorage", extensionId, "settings", "cline_mcp_settings.json"),
    join(base, "Code - Insiders", "User", "globalStorage", extensionId, "settings", "cline_mcp_settings.json"),
  ]
}

const CLI_DEFS: Record<string, CLIDef> = {
  "claude-code": {
    id: "claude-code",
    name: "Claude Code",
    icon: "CC",
    paths: () => [join(home, ".claude.json")],
    projectPaths: (root) => [join(root, ".mcp.json")],
    rulesPath: () => [join(home, ".claude", "CLAUDE.md")],
    projectRulesPath: (root) => [join(root, "CLAUDE.md")],
    skillsPath: () => [join(home, ".claude", "skills")],
    projectSkillsPath: (root) => [join(root, ".claude", "skills")],
  },
  "claude-desktop": {
    id: "claude-desktop",
    name: "Claude Desktop",
    icon: "CD",
    paths: () => [join(appDataDir(), "Claude", "claude_desktop_config.json")],
  },
  cursor: {
    id: "cursor",
    name: "Cursor",
    icon: "Cu",
    paths: () => [join(home, ".cursor", "mcp.json")],
    projectPaths: (root) => [join(root, ".cursor", "mcp.json")],
    projectRulesPath: (root) => [join(root, ".cursorrules"), join(root, ".cursor", "rules")],
    skillsPath: () => [join(home, ".cursor", "skills")],
    projectSkillsPath: (root) => [join(root, ".cursor", "skills")],
  },
  vscode: {
    id: "vscode",
    name: "VS Code",
    icon: "VS",
    paths: () => [join(appDataDir(), "Code", "User", "settings.json")],
    serverKey: "mcp.servers",
    projectPaths: (root) => [join(root, ".vscode", "mcp.json")],
    projectServerKey: "servers",
    projectRulesPath: (root) => [join(root, ".github", "copilot-instructions.md")],
  },
  windsurf: {
    id: "windsurf",
    name: "Windsurf",
    icon: "WS",
    paths: () => [
      join(home, ".codeium", "windsurf", "mcp_config.json"),
      join(appDataDir(), "Windsurf", "User", "settings.json"),
    ],
    projectRulesPath: (root) => [join(root, ".windsurfrules")],
  },
  cline: {
    id: "cline",
    name: "Cline",
    icon: "Cl",
    paths: () => vscodeGlobalStorage("saoudrizwan.claude-dev"),
    projectRulesPath: (root) => [join(root, ".clinerules")],
  },
  "roo-code": {
    id: "roo-code",
    name: "Roo Code",
    icon: "Ro",
    paths: () => vscodeGlobalStorage("rooveterinaryinc.roo-cline"),
    projectPaths: (root) => [join(root, ".roo", "mcp.json")],
    rulesPath: () => [join(home, ".roo", "rules")],
    projectRulesPath: (root) => [join(root, ".roo", "rules")],
  },
  "kilo-code": {
    id: "kilo-code",
    name: "Kilo Code",
    icon: "Ki",
    paths: () => vscodeGlobalStorage("kilocode.kilo-code"),
    projectPaths: (root) => [join(root, ".kilocode", "mcp.json")],
    projectRulesPath: (root) => [join(root, ".kilo", "rules")],
  },
  trae: {
    id: "trae",
    name: "TRAE",
    icon: "TR",
    paths: () => [
      join(home, ".trae", "mcp.json"),
      join(appDataDir(), "Trae", "User", "settings.json"),
    ],
    projectPaths: (root) => [join(root, ".trae", "mcp.json")],
    projectRulesPath: (root) => [join(root, ".trae", "rules", "project_rules.md")],
  },
  opencode: {
    id: "opencode",
    name: "OpenCode",
    icon: "OC",
    paths: () => [
      join(appDataDir(), "opencode", "opencode.json"),
    ],
    serverKey: "mcp",
    projectPaths: (root) => [join(root, "opencode.json")],
    projectServerKey: "mcp",
    projectRulesPath: (root) => [join(root, "AGENTS.md")],
    skillsPath: () => [join(appDataDir(), "opencode", "skill")],
    projectSkillsPath: (root) => [join(root, ".opencode", "skill")],
  },
  "qwen-code": {
    id: "qwen-code",
    name: "Qwen Code",
    icon: "QC",
    paths: () => [
      join(home, ".qwen.json"),
      join(home, ".qwen", "settings.json"),
    ],
    projectPaths: (root) => [join(root, ".qwen", "settings.json")],
    rulesPath: () => [join(home, ".qwen", "AGENTS.md")],
    projectRulesPath: (root) => [join(root, "AGENTS.md")],
    skillsPath: () => [join(home, ".qwen", "skills")],
    projectSkillsPath: (root) => [join(root, ".qwen", "skills")],
  },
  "claude-ide": {
    id: "claude-ide",
    name: "Claude for IDE",
    icon: "CI",
    paths: () => vscodeGlobalStorage("anthropic.claude-for-ide"),
  },
  droid: {
    id: "droid",
    name: "Droid",
    icon: "Dr",
    paths: () => [
      join(appDataDir(), "droid", "mcp.json"),
      join(home, ".droid", "mcp.json"),
    ],
    projectPaths: (root) => [join(root, ".factory", "mcp.json")],
    projectRulesPath: (root) => [join(root, ".factory", "settings.json")],
  },
  goose: {
    id: "goose",
    name: "Goose",
    icon: "Go",
    paths: () => [
      join(appDataDir(), "goose", "config.json"),
      join(home, ".config", "goose", "config.json"),
    ],
    projectRulesPath: (root) => [join(root, ".goosehints")],
  },
  crush: {
    id: "crush",
    name: "Crush",
    icon: "Cr",
    paths: () => [
      join(appDataDir(), "crush", "mcp.json"),
      join(home, ".crush", "mcp.json"),
    ],
    projectPaths: (root) => [join(root, ".crush.json")],
    projectServerKey: "mcp",
    projectRulesPath: (root) => [join(root, "AGENTS.md"), join(root, "CRUSH.md")],
  },
  eigent: {
    id: "eigent",
    name: "Eigent",
    icon: "Ei",
    paths: () => [
      join(appDataDir(), "Eigent", "mcp.json"),
      join(home, ".eigent", "mcp.json"),
    ],
  },
  "gemini-cli": {
    id: "gemini-cli",
    name: "Gemini CLI",
    icon: "Ge",
    paths: () => [join(home, ".gemini", "settings.json")],
    serverKey: "mcpServers",
    projectPaths: (root) => [join(root, ".gemini", "settings.json")],
    projectServerKey: "mcpServers",
    rulesPath: () => [join(home, ".gemini", "GEMINI.md")],
    projectRulesPath: (root) => [join(root, "GEMINI.md")],
    skillsPath: () => [join(home, ".gemini", "skills")],
    projectSkillsPath: (root) => [join(root, ".gemini", "skills")],
  },
  "amazon-q": {
    id: "amazon-q",
    name: "Amazon Q",
    icon: "AQ",
    paths: () => [join(home, ".aws", "amazonq", "mcp.json")],
    projectPaths: (root) => [join(root, ".amazonq", "mcp.json")],
    projectRulesPath: (root) => [join(root, ".amazonq", "rules")],
  },
  amp: {
    id: "amp",
    name: "Amp",
    icon: "Am",
    paths: () => [join(appDataDir(), "amp", "settings.json")],
    serverKey: "mcpServers",
    projectPaths: (root) => [join(root, ".amp", "settings.json")],
    projectServerKey: "mcpServers",
    rulesPath: () => [join(home, ".amp", "AGENT.md")],
    projectRulesPath: (root) => [join(root, "AGENT.md"), join(root, "AGENTS.md")],
    skillsPath: () => [join(home, ".amp", "skills")],
    projectSkillsPath: (root) => [join(root, ".amp", "skills")],
  },
  "codex-cli": {
    id: "codex-cli",
    name: "Codex CLI",
    icon: "Cx",
    paths: () => [join(appDataDir(), "codex", "config.toml"), join(home, ".codex", "config.toml")],
    serverKey: "mcp_servers",
    configFormat: "toml",
    projectPaths: (root) => [join(root, ".codex", "config.toml")],
    projectServerKey: "mcp_servers",
    rulesPath: () => [join(home, ".codex", "AGENTS.md")],
    projectRulesPath: (root) => [join(root, "AGENTS.md")],
    skillsPath: () => [join(home, ".codex", "skills")],
    projectSkillsPath: (root) => [join(root, ".codex", "skills")],
  },
  "copilot-cli": {
    id: "copilot-cli",
    name: "Copilot CLI",
    icon: "GH",
    paths: () => [join(home, ".copilot", "mcp-config.json")],
    projectRulesPath: (root) => [join(root, ".github", "copilot-instructions.md")],
  },
}

export function getConfigPaths(adapterId: string): string[] {
  const def = CLI_DEFS[adapterId]
  if (!def) return []
  return def.paths()
}

export function getCLIDef(adapterId: string): CLIDef | undefined {
  return CLI_DEFS[adapterId]
}

export function getAllCLIDefs(): CLIDef[] {
  return Object.values(CLI_DEFS)
}

export async function detectCLI(adapterId: string): Promise<DetectResult> {
  const paths = getConfigPaths(adapterId)
  for (const p of paths) {
    if (existsSync(p)) {
      return { installed: true, configPath: p }
    }
  }
  return { installed: false, configPath: null }
}

export async function detectAllCLIs(): Promise<Record<string, DetectResult>> {
  const results: Record<string, DetectResult> = {}
  for (const def of getAllCLIDefs()) {
    results[def.id] = await detectCLI(def.id)
  }
  return results
}
