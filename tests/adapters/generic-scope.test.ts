import { test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import type { CLIDef } from "../../src/adapters/detector"
import { GenericMCPAdapter } from "../../src/adapters/generic"

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "aix-scope-"))
})

afterEach(() => {
  rmSync(tmp, { recursive: true })
})

const testDef: CLIDef = {
  id: "test-tool",
  name: "Test Tool",
  icon: "TT",
  paths: () => [join(tmp, "global.json")],
  projectPaths: (root) => [join(root, ".test", "mcp.json")],
}

test("reads global servers with scope=global", async () => {
  writeFileSync(join(tmp, "global.json"), JSON.stringify({
    mcpServers: { s1: { command: "cmd1" } }
  }))
  const adapter = new GenericMCPAdapter(testDef, null)
  await adapter.detect()
  const servers = await adapter.getMCPServers("global")
  expect(servers).toHaveLength(1)
  expect(servers[0]._scope).toBe("global")
})

test("reads project servers with scope=project", async () => {
  const projectDir = join(tmp, "project")
  mkdirSync(join(projectDir, ".test"), { recursive: true })
  writeFileSync(join(projectDir, ".test", "mcp.json"), JSON.stringify({
    mcpServers: { s2: { command: "cmd2" } }
  }))
  const def = { ...testDef, paths: () => [join(tmp, "nonexistent.json")] }
  const adapter = new GenericMCPAdapter(def, projectDir)
  await adapter.detect()
  const servers = await adapter.getMCPServers("project")
  expect(servers).toHaveLength(1)
  expect(servers[0]._scope).toBe("project")
  expect(servers[0].name).toBe("s2")
})

test("reads both scopes with scope=all", async () => {
  writeFileSync(join(tmp, "global.json"), JSON.stringify({
    mcpServers: { g1: { command: "gcmd" } }
  }))
  const projectDir = join(tmp, "project")
  mkdirSync(join(projectDir, ".test"), { recursive: true })
  writeFileSync(join(projectDir, ".test", "mcp.json"), JSON.stringify({
    mcpServers: { p1: { command: "pcmd" } }
  }))
  const adapter = new GenericMCPAdapter(testDef, projectDir)
  await adapter.detect()
  const servers = await adapter.getMCPServers("all")
  expect(servers).toHaveLength(2)
  expect(servers.find((s) => s._scope === "global")).toBeTruthy()
  expect(servers.find((s) => s._scope === "project")).toBeTruthy()
})

test("writes to project scope", async () => {
  const projectDir = join(tmp, "project")
  mkdirSync(join(projectDir, ".test"), { recursive: true })
  const adapter = new GenericMCPAdapter(testDef, projectDir)
  await adapter.detect()
  await adapter.writeMCPServer({ name: "new", _raw: { command: "x" }, _scope: "project", _source: "test", transport: "stdio" }, "project")
  await adapter.detect()
  const servers = await adapter.getMCPServers("project")
  expect(servers).toHaveLength(1)
  expect(servers[0].name).toBe("new")
})

test("writeMCPServer creates parent directories", async () => {
  const nestedDef: CLIDef = {
    ...testDef,
    paths: () => [join(tmp, "nested", "config", "mcp.json")],
  }
  const adapter = new GenericMCPAdapter(nestedDef, null)
  await adapter.detect()
  await adapter.writeMCPServer({ name: "new", _raw: { command: "x" }, _scope: "global", _source: "test", transport: "stdio" })

  const next = new GenericMCPAdapter(nestedDef, null)
  await next.detect()
  const servers = await next.getMCPServers("global")
  expect(servers).toHaveLength(1)
  expect(servers[0].name).toBe("new")
})

test("detects installed tool from rules-only path", async () => {
  const rulePath = join(tmp, "RULES.md")
  writeFileSync(rulePath, "rules")
  const rulesOnlyDef: CLIDef = {
    id: "rules-only",
    name: "Rules Only",
    icon: "RO",
    paths: () => [join(tmp, "missing.json")],
    rulesPath: () => [rulePath],
  }

  const adapter = new GenericMCPAdapter(rulesOnlyDef, null)
  const result = await adapter.detect()

  expect(result.installed).toBe(true)
  expect(result.configPath).toBe(rulePath)
})

test("detect resets stale config paths", async () => {
  const configPath = join(tmp, "global.json")
  writeFileSync(configPath, JSON.stringify({ mcpServers: {} }))
  const adapter = new GenericMCPAdapter(testDef, null)

  expect((await adapter.detect()).installed).toBe(true)
  unlinkSync(configPath)

  const result = await adapter.detect()
  expect(result.installed).toBe(false)
  expect(result.configPath).toBeNull()
})

test("capabilities reflect configured asset paths", () => {
  const adapter = new GenericMCPAdapter({
    ...testDef,
    rulesPath: () => [join(tmp, "RULES.md")],
    skillsPath: () => [join(tmp, "skills")],
    agentsPath: () => [join(tmp, "agents")],
  }, tmp)

  expect(adapter.capabilities.mcp).toBe(true)
  expect(adapter.capabilities.rules).toBe(true)
  expect(adapter.capabilities.skills).toBe(true)
  expect(adapter.capabilities.agents).toBe(true)
  expect(adapter.capabilities.scopes).toEqual(["global", "project"])
})

test("hasProjectScope is false without projectRoot", () => {
  const adapter = new GenericMCPAdapter(testDef, null)
  expect(adapter.hasProjectScope).toBe(false)
})

test("hasProjectScope is false without projectPaths", () => {
  const noProjDef = { ...testDef, projectPaths: undefined }
  const adapter = new GenericMCPAdapter(noProjDef, tmp)
  expect(adapter.hasProjectScope).toBe(false)
})
