import { test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import type { CLIDef } from "../../src/adapters/detector"
import { GenericMCPAdapter } from "../../src/adapters/generic"

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "aix-toml-"))
})

afterEach(() => {
  rmSync(tmp, { recursive: true })
})

const tomlDef: CLIDef = {
  id: "codex-test",
  name: "Codex Test",
  icon: "Cx",
  paths: () => [join(tmp, "config.toml")],
  serverKey: "mcp_servers",
  configFormat: "toml",
  projectPaths: (root) => [join(root, ".codex", "config.toml")],
  projectServerKey: "mcp_servers",
}

test("reads MCP servers from TOML config", async () => {
  writeFileSync(join(tmp, "config.toml"), `[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp"]

[mcp_servers.github]
command = "gh"
args = ["mcp"]
`)
  const adapter = new GenericMCPAdapter(tomlDef, null)
  await adapter.detect()
  const servers = await adapter.getMCPServers()
  expect(servers).toHaveLength(2)
  expect(servers.map((s) => s.name).sort()).toEqual(["github", "playwright"])
  expect(servers.find((s) => s.name === "playwright")!.command).toBe("npx")
})

test("returns empty array for empty TOML config", async () => {
  writeFileSync(join(tmp, "config.toml"), "")
  const adapter = new GenericMCPAdapter(tomlDef, null)
  await adapter.detect()
  const servers = await adapter.getMCPServers()
  expect(servers).toHaveLength(0)
})

test("returns empty array when mcp_servers key missing in TOML", async () => {
  writeFileSync(join(tmp, "config.toml"), `[other_section]
key = "value"
`)
  const adapter = new GenericMCPAdapter(tomlDef, null)
  await adapter.detect()
  const servers = await adapter.getMCPServers()
  expect(servers).toHaveLength(0)
})

test("writes MCP server to TOML config", async () => {
  writeFileSync(join(tmp, "config.toml"), "")
  const adapter = new GenericMCPAdapter(tomlDef, null)
  await adapter.detect()
  await adapter.writeMCPServer({
    name: "my-server",
    transport: "stdio",
    command: "node",
    args: ["server.js"],
    _raw: { command: "node", args: ["server.js"] },
    _source: "codex-test",
    _scope: "global",
  })
  const text = await Bun.file(join(tmp, "config.toml")).text()
  expect(text).toContain("my-server")
  expect(text).toContain("node")

  // verify it can be read back
  const adapter2 = new GenericMCPAdapter(tomlDef, null)
  await adapter2.detect()
  const servers = await adapter2.getMCPServers()
  expect(servers).toHaveLength(1)
  expect(servers[0].name).toBe("my-server")
  expect(servers[0].command).toBe("node")
})

test("writes MCP server to existing TOML config", async () => {
  writeFileSync(join(tmp, "config.toml"), `[mcp_servers.existing]
command = "old"
args = []
`)
  const adapter = new GenericMCPAdapter(tomlDef, null)
  await adapter.detect()
  await adapter.writeMCPServer({
    name: "new-server",
    transport: "stdio",
    command: "new-cmd",
    args: ["--flag"],
    _raw: { command: "new-cmd", args: ["--flag"] },
    _source: "codex-test",
    _scope: "global",
  })
  const adapter2 = new GenericMCPAdapter(tomlDef, null)
  await adapter2.detect()
  const servers = await adapter2.getMCPServers()
  expect(servers).toHaveLength(2)
  expect(servers.map((s) => s.name).sort()).toEqual(["existing", "new-server"])
})

test("removes MCP server from TOML config", async () => {
  writeFileSync(join(tmp, "config.toml"), `[mcp_servers.keep]
command = "keep-cmd"
args = []

[mcp_servers.remove]
command = "remove-cmd"
args = []
`)
  const adapter = new GenericMCPAdapter(tomlDef, null)
  await adapter.detect()
  await adapter.removeMCPServer("remove")
  const adapter2 = new GenericMCPAdapter(tomlDef, null)
  await adapter2.detect()
  const servers = await adapter2.getMCPServers()
  expect(servers).toHaveLength(1)
  expect(servers[0].name).toBe("keep")
})

test("detects TOML config file", async () => {
  writeFileSync(join(tmp, "config.toml"), "")
  const adapter = new GenericMCPAdapter(tomlDef, null)
  const result = await adapter.detect()
  expect(result.installed).toBe(true)
})

test("detect returns false when TOML config missing", async () => {
  const adapter = new GenericMCPAdapter(tomlDef, null)
  const result = await adapter.detect()
  expect(result.installed).toBe(false)
})
