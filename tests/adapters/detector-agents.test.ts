import { describe, test, expect } from "bun:test"
import { homedir } from "node:os"
import { join } from "node:path"
import { getCLIDef } from "../../src/adapters/detector"

const home = homedir()

describe("CLIDef.agentsPath", () => {
  test("claude-code global path", () => {
    const def = getCLIDef("claude-code")!
    expect(def.agentsPath!()).toEqual([join(home, ".claude", "agents")])
  })

  test("claude-code project path", () => {
    const def = getCLIDef("claude-code")!
    expect(def.projectAgentsPath!("/tmp/x")).toEqual(["/tmp/x/.claude/agents"])
  })

  test("opencode global path", () => {
    const def = getCLIDef("opencode")!
    const paths = def.agentsPath!()
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0]).toContain("opencode")
    expect(paths[0]).toContain("agents")
  })

  test("opencode project path", () => {
    const def = getCLIDef("opencode")!
    expect(def.projectAgentsPath!("/tmp/x")).toEqual(["/tmp/x/.opencode/agents"])
  })

  test("qwen-code global path", () => {
    const def = getCLIDef("qwen-code")!
    expect(def.agentsPath!()).toEqual([join(home, ".qwen", "agents")])
  })

  test("qwen-code project path", () => {
    const def = getCLIDef("qwen-code")!
    expect(def.projectAgentsPath!("/tmp/x")).toEqual(["/tmp/x/.qwen/agents"])
  })

  test("gemini-cli global path", () => {
    const def = getCLIDef("gemini-cli")!
    expect(def.agentsPath!()).toEqual([join(home, ".gemini", "agents")])
  })

  test("gemini-cli project path", () => {
    const def = getCLIDef("gemini-cli")!
    expect(def.projectAgentsPath!("/tmp/x")).toEqual(["/tmp/x/.gemini/agents"])
  })

  test("cursor global path", () => {
    const def = getCLIDef("cursor")!
    expect(def.agentsPath!()).toEqual([join(home, ".cursor", "agents")])
  })

  test("cursor project path", () => {
    const def = getCLIDef("cursor")!
    expect(def.projectAgentsPath!("/tmp/x")).toEqual(["/tmp/x/.cursor/agents"])
  })

  test("unsupported tool has no agentsPath", () => {
    const def = getCLIDef("vscode")!
    expect(def.agentsPath).toBeUndefined()
    expect(def.projectAgentsPath).toBeUndefined()
  })
})
