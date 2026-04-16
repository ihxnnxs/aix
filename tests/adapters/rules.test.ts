import { test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import type { CLIDef } from "../../src/adapters/detector"
import { GenericMCPAdapter } from "../../src/adapters/generic"

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "aix-rules-"))
})

afterEach(() => {
  rmSync(tmp, { recursive: true })
})

const rulesDef: CLIDef = {
  id: "rules-test",
  name: "Rules Test",
  icon: "RT",
  paths: () => [join(tmp, "config.json")],
  rulesPath: () => [join(tmp, "RULES.md")],
  projectRulesPath: (root) => [join(root, "PROJECT_RULES.md")],
}

test("reads global rules file", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  writeFileSync(join(tmp, "RULES.md"), "# My Rules\n\nDo this.\nDo that.\n")
  const adapter = new GenericMCPAdapter(rulesDef, null)
  await adapter.detect()
  const rules = await adapter.getRulesFiles("global")
  expect(rules).toHaveLength(1)
  expect(rules[0].name).toBe("RULES.md")
  expect(rules[0].content).toContain("My Rules")
  expect(rules[0].lines).toBe(5)
  expect(rules[0]._scope).toBe("global")
  expect(rules[0]._source).toBe("rules-test")
})

test("reads project rules file", async () => {
  const projDir = join(tmp, "project")
  mkdirSync(projDir, { recursive: true })
  writeFileSync(join(tmp, "config.json"), "{}")
  writeFileSync(join(projDir, "PROJECT_RULES.md"), "project rules content")
  const adapter = new GenericMCPAdapter(rulesDef, projDir)
  await adapter.detect()
  const rules = await adapter.getRulesFiles("project")
  expect(rules).toHaveLength(1)
  expect(rules[0].name).toBe("PROJECT_RULES.md")
  expect(rules[0]._scope).toBe("project")
})

test("reads both scopes with scope=all", async () => {
  const projDir = join(tmp, "project")
  mkdirSync(projDir, { recursive: true })
  writeFileSync(join(tmp, "config.json"), "{}")
  writeFileSync(join(tmp, "RULES.md"), "global rules")
  writeFileSync(join(projDir, "PROJECT_RULES.md"), "project rules")
  const adapter = new GenericMCPAdapter(rulesDef, projDir)
  await adapter.detect()
  const rules = await adapter.getRulesFiles("all")
  expect(rules).toHaveLength(2)
  expect(rules.find((r) => r._scope === "global")).toBeTruthy()
  expect(rules.find((r) => r._scope === "project")).toBeTruthy()
})

test("returns empty array when no rules exist", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  const adapter = new GenericMCPAdapter(rulesDef, null)
  await adapter.detect()
  const rules = await adapter.getRulesFiles()
  expect(rules).toHaveLength(0)
})

test("scans directory for .md files", async () => {
  const rulesDir = join(tmp, "rules-dir")
  mkdirSync(rulesDir, { recursive: true })
  writeFileSync(join(rulesDir, "rule1.md"), "first rule")
  writeFileSync(join(rulesDir, "rule2.md"), "second rule")
  writeFileSync(join(rulesDir, "ignored.txt"), "not a rule")

  const dirDef: CLIDef = {
    id: "dir-test",
    name: "Dir Test",
    icon: "DT",
    paths: () => [join(tmp, "config.json")],
    rulesPath: () => [rulesDir],
  }
  writeFileSync(join(tmp, "config.json"), "{}")
  const adapter = new GenericMCPAdapter(dirDef, null)
  await adapter.detect()
  const rules = await adapter.getRulesFiles("global")
  expect(rules).toHaveLength(2)
  expect(rules.map((r) => r.name).sort()).toEqual(["rule1.md", "rule2.md"])
})

test("scans directory for .mdc files", async () => {
  const rulesDir = join(tmp, "mdc-dir")
  mkdirSync(rulesDir, { recursive: true })
  writeFileSync(join(rulesDir, "rule.mdc"), "mdc rule content")

  const mdcDef: CLIDef = {
    id: "mdc-test",
    name: "MDC Test",
    icon: "MC",
    paths: () => [join(tmp, "config.json")],
    rulesPath: () => [rulesDir],
  }
  writeFileSync(join(tmp, "config.json"), "{}")
  const adapter = new GenericMCPAdapter(mdcDef, null)
  await adapter.detect()
  const rules = await adapter.getRulesFiles("global")
  expect(rules).toHaveLength(1)
  expect(rules[0].name).toBe("rule.mdc")
})

test("writes rules file", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  const adapter = new GenericMCPAdapter(rulesDef, null)
  await adapter.detect()
  const targetPath = join(tmp, "output", "RULES.md")
  await adapter.writeRulesFile("new rules content", targetPath)
  const content = await Bun.file(targetPath).text()
  expect(content).toBe("new rules content")
})

test("writeRulesFile creates parent directories", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  const adapter = new GenericMCPAdapter(rulesDef, null)
  await adapter.detect()
  const targetPath = join(tmp, "deep", "nested", "dir", "RULES.md")
  await adapter.writeRulesFile("nested content", targetPath)
  const content = await Bun.file(targetPath).text()
  expect(content).toBe("nested content")
})
