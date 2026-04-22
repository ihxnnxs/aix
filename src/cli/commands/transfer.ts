import type { CommandModule } from "yargs"
import { GenericMCPAdapter } from "../../adapters/generic"
import { getAllCLIDefs } from "../../adapters/detector"
import { findProjectRoot } from "../../utils/project"
import { planAgentTransfer, planRulesTransfer, planSkillTransfer, planMCPTransfer, formatPlan } from "../../utils/plan"
import { BackupManager } from "../../config/backup"
import { existsSync } from "node:fs"
import { join } from "node:path"
import type { TransferPlan } from "../../adapters/types"

function exitWithError(msg: string): never {
  console.error(msg)
  process.exit(1)
  throw new Error(msg) // unreachable, but makes TypeScript happy
}

export const TransferCommand: CommandModule = {
  command: "transfer",
  describe: "Transfer MCP servers between CLI tools",
  builder: (y) =>
    y
      .option("from", { type: "string", describe: "Source tool id" })
      .option("to", { type: "string", describe: "Target tool id" })
      .option("type", {
        type: "string",
        choices: ["mcp", "rules", "skills", "agents"],
        describe: "Asset type",
      })
      .option("name", { type: "string", describe: "Asset name to transfer" })
      .option("scope", {
        type: "string",
        choices: ["global", "project"],
        default: "global",
      })
      .option("dry-run", {
        type: "boolean",
        default: false,
        describe: "Print plan without writing",
      }),
  handler: async (args: any) => {
    if (args.from && args.to && args.type && args.name) {
      await runNonInteractive(args)
      return
    }
    // Fallback: launch TUI (preserve existing behavior)
    const { startTUI } = await import("../../tui/app")
    const { createAllAdapters } = await import("../../adapters/registry")
    const projectRoot = findProjectRoot(process.cwd())
    await startTUI(createAllAdapters(projectRoot), projectRoot, "transfer")
  },
}

async function runNonInteractive(args: any): Promise<void> {
  const fromDef = getAllCLIDefs().find((d) => d.id === args.from)
  const toDef = getAllCLIDefs().find((d) => d.id === args.to)
  if (!fromDef || !toDef) {
    exitWithError(`Unknown tool: ${!fromDef ? args.from : args.to}`)
  }

  const projectRoot = findProjectRoot(process.cwd())
  const fromAdapter = new GenericMCPAdapter(fromDef, projectRoot)
  const toAdapter = new GenericMCPAdapter(toDef, projectRoot)
  await fromAdapter.detect()
  await toAdapter.detect()

  const plans: TransferPlan[] = []

  if (args.type === "agents") {
    const agents = await fromAdapter.getAgentFiles()
    const agent = agents.find((a) => a.name === args.name)
    if (!agent) {
      exitWithError(`Agent not found: ${args.name}`)
    }
    const targetDir =
      args.scope === "project" && projectRoot && toDef.projectAgentsPath
        ? toDef.projectAgentsPath(projectRoot)[0]
        : toDef.agentsPath?.()[0]
    if (!targetDir) {
      exitWithError(`Target tool ${toDef.id} does not support agents`)
    }
    const targetPath = join(targetDir, agent.name)
    plans.push(planAgentTransfer(agent.name, targetPath))

    if (args["dry-run"]) {
      console.log(formatPlan(plans))
      return
    }

    if (existsSync(targetPath)) {
      await new BackupManager().create(toDef.id, targetPath)
    }
    await toAdapter.writeAgentFile(agent.content, targetPath)
    console.log(`✓ Transferred ${agent.name} to ${targetPath}`)
  } else if (args.type === "rules") {
    const rules = await fromAdapter.getRulesFiles()
    const rule = rules.find((r) => r.name === args.name)
    if (!rule) {
      exitWithError(`Rule not found: ${args.name}`)
    }
    const targetPath = args.scope === "project" && projectRoot && toDef.projectRulesPath
      ? toDef.projectRulesPath(projectRoot)[0]
      : (toDef.rulesPath?.()[0] ?? (projectRoot && toDef.projectRulesPath ? toDef.projectRulesPath(projectRoot)[0] : undefined))
    if (!targetPath) {
      exitWithError(`Target tool ${toDef.id} does not support rules`)
    }
    plans.push(planRulesTransfer(rule.name, targetPath))

    if (args["dry-run"]) {
      console.log(formatPlan(plans))
      return
    }

    if (existsSync(targetPath)) {
      await new BackupManager().create(toDef.id, targetPath)
    }
    await toAdapter.writeRulesFile(rule.content, targetPath)
    console.log(`✓ Transferred rule ${rule.name} to ${targetPath}`)

  } else if (args.type === "skills") {
    const skills = await fromAdapter.getSkillFiles()
    const skill = skills.find((s) => s.name === args.name)
    if (!skill) {
      exitWithError(`Skill not found: ${args.name}`)
    }
    const targetDir = args.scope === "project" && projectRoot && toDef.projectSkillsPath
      ? toDef.projectSkillsPath(projectRoot)[0]
      : toDef.skillsPath?.()[0]
    if (!targetDir) {
      exitWithError(`Target tool ${toDef.id} does not support skills`)
    }
    const targetPath = join(targetDir, skill.name, "SKILL.md")
    plans.push(planSkillTransfer(skill.name, targetPath))

    if (args["dry-run"]) {
      console.log(formatPlan(plans))
      return
    }

    if (existsSync(targetPath)) {
      await new BackupManager().create(toDef.id, targetPath)
    }
    await toAdapter.writeSkillFile(skill.content, targetPath)
    console.log(`✓ Transferred skill ${skill.name} to ${targetPath}`)

  } else if (args.type === "mcp") {
    const servers = await fromAdapter.getMCPServers()
    const server = servers.find((s) => s.name === args.name)
    if (!server) {
      exitWithError(`MCP server not found: ${args.name}`)
    }
    const targetPath = args.scope === "project" && projectRoot && toDef.projectPaths
      ? toDef.projectPaths(projectRoot)[0]
      : toDef.paths()[0]
    plans.push(planMCPTransfer(server.name, targetPath))

    if (args["dry-run"]) {
      console.log(formatPlan(plans))
      return
    }

    if (existsSync(targetPath)) {
      await new BackupManager().create(toDef.id, targetPath)
    }
    await toAdapter.writeMCPServer(server, args.scope)
    console.log(`✓ Transferred server ${server.name} to ${targetPath}`)
  }
}
