import type { CommandModule } from "yargs"
import { GenericMCPAdapter } from "../../adapters/generic"
import { getAllCLIDefs } from "../../adapters/detector"
import { findProjectRoot } from "../../utils/project"
import { planAgentTransfer, formatPlan } from "../../utils/plan"
import { BackupManager } from "../../config/backup"
import { existsSync } from "node:fs"
import { join } from "node:path"
import type { TransferPlan } from "../../adapters/types"

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
    console.error(`Unknown tool: ${!fromDef ? args.from : args.to}`)
    process.exit(1)
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
      console.error(`Agent not found: ${args.name}`)
      process.exit(1)
    }
    const targetDir =
      args.scope === "project" && projectRoot && toDef.projectAgentsPath
        ? toDef.projectAgentsPath(projectRoot)[0]
        : toDef.agentsPath?.()[0]
    if (!targetDir) {
      console.error(`Target tool ${toDef.id} does not support agents`)
      process.exit(1)
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
  } else {
    console.error(`Non-interactive mode for ${args.type} not yet implemented`)
    process.exit(1)
  }
}
