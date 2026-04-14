import { describe, expect, test } from "bun:test"
import { createMCPServer } from "../../src/adapters/types"

describe("createMCPServer", () => {
  test("creates stdio server from raw config", () => {
    const raw = { command: "npx", args: ["-y", "@playwright/mcp"], env: { DEBUG: "true" } }
    const server = createMCPServer("playwright", raw, "claude-code")
    expect(server.name).toBe("playwright")
    expect(server.transport).toBe("stdio")
    expect(server.command).toBe("npx")
    expect(server.args).toEqual(["-y", "@playwright/mcp"])
    expect(server._raw).toEqual(raw)
    expect(server._source).toBe("claude-code")
  })

  test("creates http server from raw config with url", () => {
    const raw = { url: "https://mcp.example.com/sse" }
    const server = createMCPServer("remote", raw, "cursor")
    expect(server.name).toBe("remote")
    expect(server.transport).toBe("http")
    expect(server.url).toBe("https://mcp.example.com/sse")
  })

  test("preserves extra fields in _raw", () => {
    const raw = { command: "node", args: ["server.js"], customField: "value", nested: { a: 1 } }
    const server = createMCPServer("custom", raw, "test")
    expect(server._raw.customField).toBe("value")
    expect(server._raw.nested).toEqual({ a: 1 })
  })

  test("handles missing optional fields gracefully", () => {
    const raw = {}
    const server = createMCPServer("empty", raw, "test")
    expect(server.name).toBe("empty")
    expect(server.transport).toBe("stdio")
    expect(server.command).toBeUndefined()
    expect(server.args).toBeUndefined()
    expect(server.env).toBeUndefined()
    expect(server.url).toBeUndefined()
    expect(server.headers).toBeUndefined()
  })
})
