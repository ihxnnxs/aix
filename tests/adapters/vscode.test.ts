import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { VSCodeAdapter } from "../../src/adapters/vscode"

let tmpDir: string
let configPath: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), ".tmp-aix-vscode-"))
  configPath = join(tmpDir, "settings.json")
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe("VSCodeAdapter", () => {
  test("reads MCP servers from 'servers' key (not mcpServers)", async () => {
    const config = {
      "editor.fontSize": 14,
      servers: {
        playwright: { command: "npx", args: ["-y", "@playwright/mcp"] },
        github: { command: "gh", args: ["mcp"] },
      },
    }
    await Bun.write(configPath, JSON.stringify(config, null, 2))

    const adapter = new VSCodeAdapter(configPath)
    const servers = await adapter.getMCPServers()

    expect(servers).toHaveLength(2)
    expect(servers.map((s) => s.name).sort()).toEqual(["github", "playwright"])
    expect(servers[0]._source).toBe("vscode")
  })

  test("returns empty array when no servers key", async () => {
    await Bun.write(configPath, JSON.stringify({ "editor.fontSize": 14 }))

    const adapter = new VSCodeAdapter(configPath)
    const servers = await adapter.getMCPServers()

    expect(servers).toEqual([])
  })

  test("does not read from mcpServers key", async () => {
    const config = {
      mcpServers: {
        shouldNotAppear: { command: "no" },
      },
    }
    await Bun.write(configPath, JSON.stringify(config))

    const adapter = new VSCodeAdapter(configPath)
    const servers = await adapter.getMCPServers()

    expect(servers).toEqual([])
  })

  test("writes MCP server under 'servers' key", async () => {
    await Bun.write(configPath, JSON.stringify({ "editor.fontSize": 14 }, null, 2))

    const adapter = new VSCodeAdapter(configPath)
    const raw = { command: "npx", args: ["-y", "@playwright/mcp"] }
    await adapter.writeMCPServer({
      name: "playwright",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@playwright/mcp"],
      _raw: raw,
      _source: "vscode",
    })

    const text = await Bun.file(configPath).text()
    const parsed = JSON.parse(text)
    expect(parsed.servers.playwright).toEqual(raw)
    expect(parsed["editor.fontSize"]).toBe(14)
    expect(parsed.mcpServers).toBeUndefined()
  })

  test("removes MCP server from 'servers' key", async () => {
    const config = {
      servers: {
        playwright: { command: "npx", args: ["-y", "@playwright/mcp"] },
        github: { command: "gh", args: ["mcp"] },
      },
    }
    await Bun.write(configPath, JSON.stringify(config, null, 2))

    const adapter = new VSCodeAdapter(configPath)
    await adapter.removeMCPServer("playwright")

    const text = await Bun.file(configPath).text()
    const parsed = JSON.parse(text)
    expect(parsed.servers.playwright).toBeUndefined()
    expect(parsed.servers.github).toBeDefined()
  })

  test("detect returns correct result", async () => {
    await Bun.write(configPath, "{}")
    const adapter = new VSCodeAdapter(configPath)
    const result = await adapter.detect()
    expect(result.installed).toBe(true)
    expect(result.configPath).toBe(configPath)
  })
})
