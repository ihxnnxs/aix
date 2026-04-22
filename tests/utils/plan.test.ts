import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { planAgentTransfer, planRulesTransfer, formatPlan } from "../../src/utils/plan"

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "aix-plan-"))
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

describe("planAgentTransfer", () => {
  test("create action when target does not exist", () => {
    const targetPath = join(tmp, "agents", "new.md")
    const plan = planAgentTransfer("planner.md", targetPath)
    expect(plan.action).toBe("create")
    expect(plan.existingSize).toBeUndefined()
    expect(plan.kind).toBe("agents")
    expect(plan.targetPath).toBe(targetPath)
  })

  test("overwrite action with existingSize when target exists", () => {
    const dir = join(tmp, "agents")
    mkdirSync(dir, { recursive: true })
    const targetPath = join(dir, "existing.md")
    writeFileSync(targetPath, "old content here")

    const plan = planAgentTransfer("existing.md", targetPath)
    expect(plan.action).toBe("overwrite")
    expect(plan.existingSize).toBe(statSync(targetPath).size)
  })

  test("does not mutate filesystem", () => {
    const dir = join(tmp, "agents")
    mkdirSync(dir, { recursive: true })
    const targetPath = join(dir, "a.md")
    writeFileSync(targetPath, "immutable")

    const before = statSync(targetPath).mtime.getTime()
    planAgentTransfer("a.md", targetPath)
    const after = statSync(targetPath).mtime.getTime()

    expect(after).toBe(before)
  })
})

describe("planRulesTransfer", () => {
  test("create action for new rule file", () => {
    const targetPath = join(tmp, "CLAUDE.md")
    const plan = planRulesTransfer("CLAUDE.md", targetPath)
    expect(plan.kind).toBe("rules")
    expect(plan.action).toBe("create")
  })
})

describe("formatPlan", () => {
  test("formats create action", () => {
    const plan = {
      kind: "agents" as const,
      action: "create" as const,
      sourceName: "planner.md",
      targetPath: "/home/user/.cursor/agents/planner.md",
      warnings: [],
    }
    const text = formatPlan([plan])
    expect(text).toContain("create")
    expect(text).toContain("/home/user/.cursor/agents/planner.md")
  })

  test("formats overwrite with size", () => {
    const plan = {
      kind: "agents" as const,
      action: "overwrite" as const,
      sourceName: "r.md",
      targetPath: "/tmp/r.md",
      existingSize: 1234,
      warnings: [],
    }
    const text = formatPlan([plan])
    expect(text).toContain("overwrite")
    expect(text).toContain("1.2 KB")
  })

  test("empty plan prints nothing to transfer", () => {
    const text = formatPlan([])
    expect(text).toContain("No actions")
  })
})
