import { describe, expect, test } from "bun:test"
import {
  getConfigPaths,
  getCLIDef,
  getAllCLIDefs,
  detectCLI,
  detectAllCLIs,
} from "../../src/adapters/detector"

describe("getConfigPaths", () => {
  test("returns non-empty array for claude-code", () => {
    const paths = getConfigPaths("claude-code")
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0]).toContain(".claude.json")
  })

  test("returns non-empty array for claude-desktop", () => {
    const paths = getConfigPaths("claude-desktop")
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0]).toContain("claude_desktop_config.json")
  })

  test("returns non-empty array for cursor", () => {
    const paths = getConfigPaths("cursor")
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0]).toContain(".cursor")
    expect(paths[0]).toContain("mcp.json")
  })

  test("returns non-empty array for vscode", () => {
    const paths = getConfigPaths("vscode")
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0]).toContain("settings.json")
  })

  test("returns empty array for unknown adapter", () => {
    const paths = getConfigPaths("unknown-adapter")
    expect(paths).toEqual([])
  })
})

describe("getCLIDef", () => {
  test("returns def for known adapter", () => {
    const def = getCLIDef("claude-code")
    expect(def).toBeDefined()
    expect(def!.id).toBe("claude-code")
    expect(def!.name).toBe("Claude Code")
    expect(def!.icon).toBeTruthy()
  })

  test("returns undefined for unknown adapter", () => {
    expect(getCLIDef("nonexistent")).toBeUndefined()
  })
})

describe("getAllCLIDefs", () => {
  test("returns all CLI definitions", () => {
    const defs = getAllCLIDefs()
    expect(defs.length).toBe(16)
    const ids = defs.map((d) => d.id)
    expect(ids).toContain("claude-code")
    expect(ids).toContain("claude-desktop")
    expect(ids).toContain("cursor")
    expect(ids).toContain("vscode")
  })
})

describe("detectCLI", () => {
  test("returns DetectResult with installed boolean", async () => {
    const result = await detectCLI("claude-code")
    expect(typeof result.installed).toBe("boolean")
    if (result.installed) {
      expect(result.configPath).toBeTruthy()
    } else {
      expect(result.configPath).toBeNull()
    }
  })
})

describe("detectAllCLIs", () => {
  test("returns results for all known adapters", async () => {
    const results = await detectAllCLIs()
    expect(Object.keys(results)).toContain("claude-code")
    expect(Object.keys(results)).toContain("claude-desktop")
    expect(Object.keys(results)).toContain("cursor")
    expect(Object.keys(results)).toContain("vscode")
  })
})
