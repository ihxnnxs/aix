import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { ClaudeDesktopAdapter } from "../../src/adapters/claude-desktop"

let tmpDir: string
let configPath: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), ".tmp-aix-claude-desktop-"))
  configPath = join(tmpDir, "claude_desktop_config.json")
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe("ClaudeDesktopAdapter", () => {
  test("reads MCP servers from config", async () => {
    const config = {
      mcpServers: {
        playwright: { command: "npx", args: ["-y", "@playwright/mcp"] },
        github: { command: "gh", args: ["mcp"] },
      },
    }
    await Bun.write(configPath, JSON.stringify(config, null, 2))

    const adapter = new ClaudeDesktopAdapter(configPath)
    const servers = await adapter.getMCPServers()

    expect(servers).toHaveLength(2)
    expect(servers.map((s) => s.name).sort()).toEqual(["github", "playwright"])
  })

  test("returns empty array when no mcpServers key", async () => {
    await Bun.write(configPath, JSON.stringify({ otherConfig: true }))

    const adapter = new ClaudeDesktopAdapter(configPath)
    const servers = await adapter.getMCPServers()

    expect(servers).toEqual([])
  })

  test("writes MCP server to config", async () => {
    await Bun.write(configPath, JSON.stringify({ mcpServers: {} }, null, 2))

    const adapter = new ClaudeDesktopAdapter(configPath)
    const raw = { command: "npx", args: ["-y", "@playwright/mcp"] }
    await adapter.writeMCPServer({
      name: "playwright",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@playwright/mcp"],
      _raw: raw,
      _source: "claude-desktop",
    })

    const text = await Bun.file(configPath).text()
    const parsed = JSON.parse(text)
    expect(parsed.mcpServers.playwright).toEqual(raw)
  })

  test("removes MCP server from config", async () => {
    const config = {
      mcpServers: {
        playwright: { command: "npx", args: ["-y", "@playwright/mcp"] },
        github: { command: "gh", args: ["mcp"] },
      },
    }
    await Bun.write(configPath, JSON.stringify(config, null, 2))

    const adapter = new ClaudeDesktopAdapter(configPath)
    await adapter.removeMCPServer("playwright")

    const text = await Bun.file(configPath).text()
    const parsed = JSON.parse(text)
    expect(parsed.mcpServers.playwright).toBeUndefined()
    expect(parsed.mcpServers.github).toBeDefined()
  })

  test("detect returns correct result", async () => {
    await Bun.write(configPath, "{}")
    const adapter = new ClaudeDesktopAdapter(configPath)
    const result = await adapter.detect()
    expect(result.installed).toBe(true)
    expect(result.configPath).toBe(configPath)
  })
})
