import { test, expect } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { GenericMCPAdapter } from "../../src/adapters/generic"
import type { CLIDef } from "../../src/adapters/detector"

test("agent transfer respects project scope", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "aix-proj-"))
  try {
    const home = join(tmp, "home")
    const project = join(tmp, "myproject")
    mkdirSync(join(project, ".git"), { recursive: true })

    const claudeGlobal = join(home, ".claude", "agents")
    mkdirSync(claudeGlobal, { recursive: true })
    writeFileSync(join(claudeGlobal, "planner.md"), "---\nname: planner\n---\nglobal body")

    const claudeDef: CLIDef = {
      id: "claude-code",
      name: "Claude Code",
      icon: "CC",
      paths: () => [join(home, ".claude.json")],
      agentsPath: () => [claudeGlobal],
      projectAgentsPath: (root) => [join(root, ".claude", "agents")],
    }

    const cursorGlobal = join(home, ".cursor", "agents")
    const cursorDef: CLIDef = {
      id: "cursor",
      name: "Cursor",
      icon: "Cu",
      paths: () => [join(home, ".cursor", "mcp.json")],
      agentsPath: () => [cursorGlobal],
      projectAgentsPath: (root) => [join(root, ".cursor", "agents")],
    }

    const fromAdapter = new GenericMCPAdapter(claudeDef, project)
    const toAdapter = new GenericMCPAdapter(cursorDef, project)

    const agents = await fromAdapter.getAgentFiles("global")
    expect(agents).toHaveLength(1)

    const projectTarget = cursorDef.projectAgentsPath!(project)[0]
    const targetFile = join(projectTarget, agents[0].name)
    await toAdapter.writeAgentFile(agents[0].content, targetFile)

    expect(existsSync(targetFile)).toBe(true)
    expect(existsSync(join(cursorGlobal, "planner.md"))).toBe(false)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})
