import { describe, expect, test } from "bun:test"
import { getConfigPaths, getCLIDef } from "../../src/adapters/detector"

describe("Gemini CLI", () => {
  test("has config paths", () => {
    const paths = getConfigPaths("gemini-cli")
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0]).toContain(".gemini")
    expect(paths[0]).toContain("settings.json")
  })

  test("has correct def", () => {
    const def = getCLIDef("gemini-cli")
    expect(def).toBeDefined()
    expect(def!.serverKey).toBe("mcpServers")
    expect(def!.rulesPath).toBeDefined()
    expect(def!.projectRulesPath).toBeDefined()
    expect(def!.projectPaths).toBeDefined()
  })

  test("rules path contains GEMINI.md", () => {
    const def = getCLIDef("gemini-cli")!
    expect(def.rulesPath!()[0]).toContain("GEMINI.md")
    expect(def.projectRulesPath!("/proj")[0]).toBe("/proj/GEMINI.md")
  })
})

describe("Amazon Q", () => {
  test("has config paths", () => {
    const paths = getConfigPaths("amazon-q")
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0]).toContain(".aws")
    expect(paths[0]).toContain("amazonq")
  })

  test("has project paths", () => {
    const def = getCLIDef("amazon-q")!
    expect(def.projectPaths).toBeDefined()
    expect(def.projectPaths!("/proj")[0]).toBe("/proj/.amazonq/mcp.json")
  })

  test("has project rules path", () => {
    const def = getCLIDef("amazon-q")!
    expect(def.projectRulesPath!("/proj")[0]).toBe("/proj/.amazonq/rules")
  })
})

describe("Amp", () => {
  test("has config paths", () => {
    const paths = getConfigPaths("amp")
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0]).toContain("amp")
    expect(paths[0]).toContain("settings.json")
  })

  test("has correct server key", () => {
    const def = getCLIDef("amp")!
    expect(def.serverKey).toBe("mcpServers")
  })

  test("has rules paths", () => {
    const def = getCLIDef("amp")!
    expect(def.rulesPath).toBeDefined()
    expect(def.rulesPath!()[0]).toContain("AGENT.md")
    const projRules = def.projectRulesPath!("/proj")
    expect(projRules).toContain("/proj/AGENT.md")
    expect(projRules).toContain("/proj/AGENTS.md")
  })
})

describe("Codex CLI", () => {
  test("has config paths", () => {
    const paths = getConfigPaths("codex-cli")
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0]).toContain("config.toml")
  })

  test("uses TOML format", () => {
    const def = getCLIDef("codex-cli")!
    expect(def.configFormat).toBe("toml")
  })

  test("has correct server key", () => {
    const def = getCLIDef("codex-cli")!
    expect(def.serverKey).toBe("mcp_servers")
  })

  test("has rules paths", () => {
    const def = getCLIDef("codex-cli")!
    expect(def.rulesPath!()[0]).toContain("AGENTS.md")
    expect(def.projectRulesPath!("/proj")[0]).toBe("/proj/AGENTS.md")
  })
})

describe("Copilot CLI", () => {
  test("has config paths", () => {
    const paths = getConfigPaths("copilot-cli")
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0]).toContain(".copilot")
    expect(paths[0]).toContain("mcp-config.json")
  })

  test("has project rules path", () => {
    const def = getCLIDef("copilot-cli")!
    expect(def.projectRulesPath!("/proj")[0]).toBe("/proj/.github/copilot-instructions.md")
  })

  test("has no global rules", () => {
    const def = getCLIDef("copilot-cli")!
    expect(def.rulesPath).toBeUndefined()
  })
})
