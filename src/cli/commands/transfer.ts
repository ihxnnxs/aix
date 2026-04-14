import type { CommandModule } from "yargs"

export const TransferCommand: CommandModule = {
  command: "transfer",
  describe: "Transfer MCP servers between CLI tools",
  handler: async () => {
    const { startTUI } = await import("../../tui/app")
    const { createAllAdapters } = await import("../../adapters/registry")
    const { findProjectRoot } = await import("../../utils/project")
    const projectRoot = findProjectRoot(process.cwd())
    await startTUI(createAllAdapters(projectRoot), projectRoot, "transfer")
  },
}
