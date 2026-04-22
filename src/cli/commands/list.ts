import type { CommandModule } from "yargs"

export const ListCommand: CommandModule = {
  command: "list",
  describe: "List MCP servers, rules, skills, and agents across tools",
  handler: async () => {
    const { startTUI } = await import("../../tui/app")
    const { createAllAdapters } = await import("../../adapters/registry")
    const { findProjectRoot } = await import("../../utils/project")
    const projectRoot = findProjectRoot(process.cwd())
    await startTUI(createAllAdapters(projectRoot), projectRoot, "list")
  },
}
