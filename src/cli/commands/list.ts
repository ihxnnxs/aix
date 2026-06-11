import type { CommandModule } from "yargs"
import type { AgentFile, MCPServer, ReadScope, RulesFile, SkillFile } from "../../adapters/types"
import { createAllAdapters } from "../../adapters/registry"
import { findProjectRoot } from "../../utils/project"
import { VERSION } from "../../version"

type ListType = "all" | "mcp" | "rules" | "skills" | "agents"

interface ListArgs {
  json?: boolean
  type?: ListType
  scope?: ReadScope
  all?: boolean
  tui?: boolean
}

interface ListedTool {
  id: string
  name: string
  icon: string
  installed: boolean
  configPath: string | null
  counts: {
    mcp: number
    rules: number
    skills: number
    agents: number
  }
  mcp: ReturnType<typeof serializeServer>[]
  rules: ReturnType<typeof serializeFile>[]
  skills: ReturnType<typeof serializeFile>[]
  agents: ReturnType<typeof serializeFile>[]
}

export const ListCommand: CommandModule<{}, ListArgs> = {
  command: "list",
  describe: "List MCP servers, rules, skills, and agents across tools",
  builder: (y) => y
    .option("json", { type: "boolean", default: false, describe: "Print machine-readable JSON" })
    .option("type", {
      choices: ["all", "mcp", "rules", "skills", "agents"] as const,
      default: "all" as const,
      describe: "Filter listed item type",
    })
    .option("scope", {
      choices: ["all", "global", "project"] as const,
      default: "all" as const,
      describe: "Filter config scope",
    })
    .option("all", { type: "boolean", default: false, describe: "Include tools with no detected items" })
    .option("tui", { type: "boolean", default: false, describe: "Open the interactive list view" }),
  handler: async (args: ListArgs) => {
    const projectRoot = findProjectRoot(process.cwd())

    if (args.tui) {
      const { startTUI } = await import("../../tui/app")
      await startTUI(createAllAdapters(projectRoot), projectRoot, "list")
      return
    }

    const result = await collectList(args.type ?? "all", args.scope ?? "all", !!args.all, projectRoot)

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
      return
    }

    printList(result)
  },
}

async function collectList(type: ListType, scope: ReadScope, includeAll: boolean, projectRoot: string | null) {
  const tools: ListedTool[] = []

  for (const adapter of createAllAdapters(projectRoot)) {
    const detection = await adapter.detect()
    const [mcp, rules, skills, agents] = await Promise.all([
      includesType(type, "mcp") ? adapter.getMCPServers(scope) : Promise.resolve([]),
      includesType(type, "rules") ? adapter.getRulesFiles(scope) : Promise.resolve([]),
      includesType(type, "skills") ? adapter.getSkillFiles(scope) : Promise.resolve([]),
      includesType(type, "agents") ? adapter.getAgentFiles(scope) : Promise.resolve([]),
    ])

    const counts = {
      mcp: mcp.length,
      rules: rules.length,
      skills: skills.length,
      agents: agents.length,
    }
    const total = counts.mcp + counts.rules + counts.skills + counts.agents

    if (!includeAll && !detection.installed && total === 0) continue

    tools.push({
      id: adapter.id,
      name: adapter.name,
      icon: adapter.icon,
      installed: detection.installed,
      configPath: detection.configPath,
      counts,
      mcp: mcp.map(serializeServer),
      rules: rules.map(serializeFile),
      skills: skills.map(serializeFile),
      agents: agents.map(serializeFile),
    })
  }

  return {
    version: VERSION,
    projectRoot,
    scope,
    type,
    tools,
  }
}

function includesType(selected: ListType, type: Exclude<ListType, "all">): boolean {
  return selected === "all" || selected === type
}

function serializeServer(server: MCPServer) {
  return {
    name: server.name,
    source: server._source,
    scope: server._scope,
    transport: server.transport,
    command: server.command,
    args: server.args,
    url: server.url,
    envKeys: Object.keys(server.env ?? {}).sort(),
    headerKeys: Object.keys(server.headers ?? {}).sort(),
  }
}

function serializeFile(file: RulesFile | SkillFile | AgentFile) {
  return {
    name: file.name,
    source: file._source,
    scope: file._scope,
    path: file.path,
    lines: file.lines,
    description: "description" in file ? file.description : undefined,
  }
}

function printList(result: Awaited<ReturnType<typeof collectList>>): void {
  if (result.tools.length === 0) {
    console.log("No MCP servers, rules, skills, or agents found")
    return
  }

  console.log(`aix ${result.version} · scope: ${result.scope} · type: ${result.type}`)
  console.log(`project: ${result.projectRoot ?? "none"}`)

  for (const tool of result.tools) {
    const total = tool.counts.mcp + tool.counts.rules + tool.counts.skills + tool.counts.agents
    const suffix = tool.installed ? "" : " · not detected"
    console.log(`\n${tool.icon} ${tool.name} (${tool.id}) · ${total} item${total === 1 ? "" : "s"}${suffix}`)

    printServers(tool.mcp)
    printFiles("Rules", tool.rules)
    printFiles("Skills", tool.skills)
    printFiles("Agents", tool.agents)
  }
}

function printServers(servers: ReturnType<typeof serializeServer>[]): void {
  if (servers.length === 0) return
  console.log(`  MCP (${servers.length})`)
  for (const server of servers) {
    const target = server.url ?? [server.command, ...(server.args ?? [])].filter(Boolean).join(" ")
    console.log(`    [${server.scope}] ${server.name}${target ? ` -> ${target}` : ""}`)
  }
}

function printFiles(label: string, files: ReturnType<typeof serializeFile>[]): void {
  if (files.length === 0) return
  console.log(`  ${label} (${files.length})`)
  for (const file of files) {
    const description = file.description ? ` · ${file.description}` : ""
    console.log(`    [${file.scope}] ${file.name} · ${file.path}${description}`)
  }
}
