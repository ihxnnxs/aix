import type { CommandModule } from "yargs"
import { getAllCLIDefs } from "../../adapters/detector"
import { GenericMCPAdapter } from "../../adapters/generic"
import { VERSION } from "../../version"
import { findProjectRoot } from "../../utils/project"

export const DoctorCommand: CommandModule = {
  command: "doctor",
  describe: "Diagnose installed AI CLI tools and their MCP configs",
  handler: async () => {
    const projectRoot = findProjectRoot(process.cwd())
    console.log()
    console.log(`  aix v${VERSION}`)
    if (projectRoot) console.log(`  Project: ${projectRoot}`)
    console.log()
    console.log("  CLI Detection")

    const defs = getAllCLIDefs()
    let foundCount = 0
    let issueCount = 0

    for (const def of defs) {
      const adapter = new GenericMCPAdapter(def, projectRoot)
      const result = await adapter.detect()
      if (result.installed) {
        console.log(`  ✓ ${def.name.padEnd(20)} ${result.configPath}`)
        foundCount++
      }
    }

    if (foundCount === 0) {
      console.log(`  ✗ No CLI tools found`)
    }

    console.log()
    console.log("  Config Health")

    for (const def of defs) {
      const adapter = new GenericMCPAdapter(def, projectRoot)
      const result = await adapter.detect()
      if (!result.installed) continue
      try {
        const globalServers = await adapter.getMCPServers("global")
        const projectServers = await adapter.getMCPServers("project")
        const total = globalServers.length + projectServers.length
        if (total > 0) {
          const parts = []
          if (globalServers.length > 0) parts.push(`${globalServers.length} global`)
          if (projectServers.length > 0) parts.push(`${projectServers.length} project`)
          console.log(`  ✓ ${def.name.padEnd(20)} ${parts.join(", ")} MCP`)
        } else {
          console.log(`  ⚠ ${def.name.padEnd(20)} config exists but empty`)
          issueCount++
        }
      } catch {
        console.log(`  ✗ ${def.name.padEnd(20)} config parse error`)
        issueCount++
      }
    }

    console.log()
    console.log("  System")
    console.log(`  ✓ Bun ${Bun.version}`)
    console.log(`  ✓ OS ${process.platform}-${process.arch}`)
    console.log()
    console.log(`  ${foundCount} CLI found · ${issueCount} issues`)
    console.log()
  },
}
