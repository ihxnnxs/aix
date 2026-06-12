import type { CommandModule } from "yargs"
import type { DoctorDiagnostic, DoctorReport } from "../../utils/doctor"
import { collectDoctorReport } from "../../utils/doctor"
import { findProjectRoot } from "../../utils/project"
import { checkForUpdate } from "../../utils/update"

interface DoctorArgs {
  json?: boolean
  fix?: boolean
  strict?: boolean
  update?: boolean
}

export const DoctorCommand: CommandModule<{}, DoctorArgs> = {
  command: "doctor",
  describe: "Diagnose AI CLI tools, MCP configs, and security risks",
  builder: (y) => y
    .option("json", { type: "boolean", default: false, describe: "Print machine-readable JSON" })
    .option("fix", { type: "boolean", default: false, describe: "Apply safe fixes such as tightening secret config file permissions" })
    .option("strict", { type: "boolean", default: false, describe: "Exit 1 when errors or security diagnostics are found" })
    .option("update", { type: "boolean", default: true, describe: "Check for aix updates" }),
  handler: async (args: DoctorArgs) => {
    const projectRoot = findProjectRoot(process.cwd())
    const updateInfo = args.update === false ? null : await checkForUpdate()
    const report = await collectDoctorReport({ projectRoot, update: updateInfo, fix: !!args.fix })

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      printDoctorReport(report, !!args.fix)
    }

    if (args.strict && (report.totals.errors > 0 || report.totals.security > 0)) {
      process.exit(1)
    }
  },
}

function printDoctorReport(report: DoctorReport, fix: boolean): void {
  console.log()
  console.log(`  aix v${report.version}`)
  if (report.projectRoot) console.log(`  Project: ${report.projectRoot}`)
  if (report.update) console.log(`  ⚠ Update available: v${report.update.current} → v${report.update.latest}`)

  console.log()
  console.log("  CLI Detection")
  const detected = report.tools.filter((tool) => tool.installed)
  if (detected.length === 0) {
    console.log("  ✗ No CLI tools found")
  } else {
    for (const tool of detected) {
      const parts = []
      if (tool.counts.mcp > 0) parts.push(`${tool.counts.mcp} MCP`)
      if (tool.counts.rules > 0) parts.push(`${tool.counts.rules} rules`)
      if (tool.counts.skills > 0) parts.push(`${tool.counts.skills} skills`)
      if (tool.counts.agents > 0) parts.push(`${tool.counts.agents} agents`)
      const suffix = parts.length > 0 ? parts.join(", ") : tool.configPath ?? "detected"
      console.log(`  ✓ ${tool.name.padEnd(20)} ${suffix}`)
    }
  }

  console.log()
  console.log("  Config & Security")
  if (report.diagnostics.length === 0) {
    console.log("  ✓ No config or security issues found")
  } else {
    for (const item of report.diagnostics) {
      console.log(formatDiagnostic(item))
    }
  }

  console.log()
  console.log("  System")
  console.log(`  ✓ Bun ${report.system.bun}`)
  console.log(`  ✓ OS ${report.system.platform}-${report.system.arch}`)
  console.log()
  console.log(`  ${report.totals.detected} CLI found · ${report.totals.configs} config${report.totals.configs === 1 ? "" : "s"} · ${report.totals.mcpServers} MCP · ${report.totals.diagnostics} issue${report.totals.diagnostics === 1 ? "" : "s"}`)
  if (report.totals.security > 0 || report.totals.errors > 0 || report.totals.warnings > 0) {
    console.log(`  ${report.totals.security} security · ${report.totals.errors} error${report.totals.errors === 1 ? "" : "s"} · ${report.totals.warnings} warning${report.totals.warnings === 1 ? "" : "s"}`)
  }
  if (fix) console.log(`  ${report.totals.fixed} safe fix${report.totals.fixed === 1 ? "" : "es"} applied`)
  console.log()
}

function formatDiagnostic(item: DoctorDiagnostic): string {
  const icon = item.severity === "error" ? "✗" : item.severity === "security" ? "!" : "⚠"
  const scope = item.scope ? ` ${item.scope}` : ""
  const server = item.serverName ? `/${item.serverName}` : ""
  const fixed = item.fixed ? " · fixed" : item.fixable ? " · fixable with --fix" : ""
  return `  ${icon} ${item.toolName}${scope}${server}: ${item.message}${fixed}`
}
