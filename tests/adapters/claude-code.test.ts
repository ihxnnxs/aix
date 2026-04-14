import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { ClaudeCodeAdapter } from "../../src/adapters/claude-code"

let tmpDir: string
let configPath: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), ".tmp-aix-claude-code-"))
  configPath = join(tmpDir, ".claude.json")
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe("ClaudeCodeAdapter", () => {
  test("reads MCP servers from config", async () => {
    const config = {
      mcpServers: {
        playwright: { command: "npx", args: ["-y", "@playwright/mcp"] },
        github: { command: "gh", args: ["mcp"] },
      },
    }
    await Bun.write(configPath, JSON.stringify(config, null, 2))

    const adapter = new ClaudeCodeAdapter(configPath)
    const servers = await adapter.getMCPServers()

    expect(servers).toHaveLength(2)
    expect(servers.map((s) => s.name).sort()).toEqual(["github", "playwright"])
    expect(servers.find((s) => s.name === "playwright")!.command).toBe("npx")
  })

  test("returns empty array when no mcpServers key", async () => {
    await Bun.write(configPath, JSON.stringify({ someOtherKey: true }))

    const adapter = new ClaudeCodeAdapter(configPath)
    const servers = await adapter.getMCPServers()

    expect(servers).toEqual([])
  })

  test("returns empty array when config file does not exist", async () => {
    const adapter = new ClaudeCodeAdapter(join(tmpDir, "nonexistent.json"))
    const servers = await adapter.getMCPServers()

    expect(servers).toEqual([])
  })

  test("writes MCP server to config", async () => {
    await Bun.write(configPath, JSON.stringify({ mcpServers: {} }, null, 2))

    const adapter = new ClaudeCodeAdapter(configPath)
    const raw = { command: "npx", args: ["-y", "@playwright/mcp"] }
    await adapter.writeMCPServer({
      name: "playwright",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@playwright/mcp"],
      _raw: raw,
      _source: "claude-code",
    })

    const text = await Bun.file(configPath).text()
    const parsed = JSON.parse(text)
    expect(parsed.mcpServers.playwright).toEqual(raw)
  })

  test("writes MCP server to empty config", async () => {
    const adapter = new ClaudeCodeAdapter(configPath)
    const raw = { command: "node", args: ["server.js"] }
    await adapter.writeMCPServer({
      name: "my-server",
      transport: "stdio",
      command: "node",
      args: ["server.js"],
      _raw: raw,
      _source: "claude-code",
    })

    const text = await Bun.file(configPath).text()
    const parsed = JSON.parse(text)
    expect(parsed.mcpServers["my-server"]).toEqual(raw)
  })

  test("removes MCP server from config", async () => {
    const config = {
      mcpServers: {
        playwright: { command: "npx", args: ["-y", "@playwright/mcp"] },
        github: { command: "gh", args: ["mcp"] },
      },
    }
    await Bun.write(configPath, JSON.stringify(config, null, 2))

    const adapter = new ClaudeCodeAdapter(configPath)
    await adapter.removeMCPServer("playwright")

    const text = await Bun.file(configPath).text()
    const parsed = JSON.parse(text)
    expect(parsed.mcpServers.playwright).toBeUndefined()
    expect(parsed.mcpServers.github).toBeDefined()
  })

  test("detect returns installed true when config exists", async () => {
    await Bun.write(configPath, "{}")

    const adapter = new ClaudeCodeAdapter(configPath)
    const result = await adapter.detect()

    expect(result.installed).toBe(true)
    expect(result.configPath).toBe(configPath)
  })

  test("detect returns installed false when config missing", async () => {
    const adapter = new ClaudeCodeAdapter(join(tmpDir, "missing.json"))
    const result = await adapter.detect()

    expect(result.installed).toBe(false)
    expect(result.configPath).toBeNull()
  })
})
