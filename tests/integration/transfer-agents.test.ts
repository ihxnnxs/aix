import { test, expect } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { GenericMCPAdapter } from "../../src/adapters/generic"
import type { CLIDef } from "../../src/adapters/detector"

test("agent transfer: Claude Code → Cursor preserves content", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "aix-int-"))
  try {
    const home = join(tmp, "home")
    const claudeAgents = join(home, ".claude", "agents")
    mkdirSync(claudeAgents, { recursive: true })
    const original = "---\nname: planner\ndescription: Plans\n---\n# Body\nsome prompt"
    writeFileSync(join(claudeAgents, "planner.md"), original)

    const claudeDef: CLIDef = {
      id: "claude-code",
      name: "Claude Code",
      icon: "CC",
      paths: () => [join(home, ".claude.json")],
      agentsPath: () => [claudeAgents],
    }

    const cursorAgents = join(home, ".cursor", "agents")
    mkdirSync(cursorAgents, { recursive: true })

    const cursorDef: CLIDef = {
      id: "cursor",
      name: "Cursor",
      icon: "Cu",
      paths: () => [join(home, ".cursor", "mcp.json")],
      agentsPath: () => [cursorAgents],
    }

    const fromAdapter = new GenericMCPAdapter(claudeDef)
    const toAdapter = new GenericMCPAdapter(cursorDef)

    const agents = await fromAdapter.getAgentFiles()
    expect(agents).toHaveLength(1)

    const targetPath = join(cursorAgents, agents[0].name)
    await toAdapter.writeAgentFile(agents[0].content, targetPath)

    const copied = await Bun.file(targetPath).text()
    expect(copied).toBe(original)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})
