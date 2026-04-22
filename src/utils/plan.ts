import { existsSync, statSync } from "node:fs"
import type { TransferPlan } from "../adapters/types"

export function planAgentTransfer(sourceName: string, targetPath: string, warnings: string[] = []): TransferPlan {
  const exists = existsSync(targetPath)
  return {
    kind: "agents",
    action: exists ? "overwrite" : "create",
    sourceName,
    targetPath,
    existingSize: exists ? statSync(targetPath).size : undefined,
    warnings,
  }
}

export function planRulesTransfer(sourceName: string, targetPath: string, warnings: string[] = []): TransferPlan {
  const exists = existsSync(targetPath)
  return {
    kind: "rules",
    action: exists ? "overwrite" : "create",
    sourceName,
    targetPath,
    existingSize: exists ? statSync(targetPath).size : undefined,
    warnings,
  }
}

export function planSkillTransfer(sourceName: string, targetPath: string, warnings: string[] = []): TransferPlan {
  const exists = existsSync(targetPath)
  return {
    kind: "skills",
    action: exists ? "overwrite" : "create",
    sourceName,
    targetPath,
    existingSize: exists ? statSync(targetPath).size : undefined,
    warnings,
  }
}

export function planMCPTransfer(sourceName: string, targetPath: string, warnings: string[] = []): TransferPlan {
  return {
    kind: "mcp",
    action: "merge-json",
    sourceName,
    targetPath,
    warnings,
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function formatPlan(plans: TransferPlan[]): string {
  if (plans.length === 0) return "No actions planned."

  const lines: string[] = [`[DRY-RUN] ${plans.length} action${plans.length === 1 ? "" : "s"} planned:`]

  for (const p of plans) {
    if (p.action === "merge-json") {
      lines.push(`  merge-json ${p.sourceName} into ${p.targetPath}`)
    } else if (p.action === "create") {
      lines.push(`  create ${p.targetPath}`)
    } else {
      const size = p.existingSize !== undefined ? ` (was ${formatBytes(p.existingSize)})` : ""
      lines.push(`  overwrite ${p.targetPath}${size}`)
    }
    for (const w of p.warnings) {
      lines.push(`    ⚠ ${w}`)
    }
  }

  return lines.join("\n")
}
