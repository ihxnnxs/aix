import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { GenericMCPAdapter } from "../../src/adapters/generic"
import type { CLIDef } from "../../src/adapters/detector"

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "aix-agents-"))
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

function makeDef(agentsDir: string): CLIDef {
  return {
    id: "test",
    name: "Test",
    icon: "TT",
    paths: () => [],
    agentsPath: () => [agentsDir],
    projectAgentsPath: (root) => [join(root, ".test", "agents")],
  }
}

describe("GenericMCPAdapter.getAgentFiles", () => {
  test("scans md files from global path", async () => {
    const dir = join(tmp, "agents")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "a.md"), "---\nname: a\ndescription: First\n---\nbody")
    writeFileSync(join(dir, "b.md"), "---\nname: b\ndescription: Second\n---\nbody")

    const adapter = new GenericMCPAdapter(makeDef(dir))
    const agents = await adapter.getAgentFiles("global")

    expect(agents).toHaveLength(2)
    const names = agents.map((a) => a.name).sort()
    expect(names).toEqual(["a.md", "b.md"])
  })

  test("extracts description from frontmatter", async () => {
    const dir = join(tmp, "agents")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "a.md"), "---\nname: a\ndescription: Hello world\n---\nbody")

    const adapter = new GenericMCPAdapter(makeDef(dir))
    const agents = await adapter.getAgentFiles("global")

    expect(agents[0].description).toBe("Hello world")
  })

  test("no frontmatter — description undefined, content intact", async () => {
    const dir = join(tmp, "agents")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "a.md"), "just body, no frontmatter")

    const adapter = new GenericMCPAdapter(makeDef(dir))
    const agents = await adapter.getAgentFiles("global")

    expect(agents).toHaveLength(1)
    expect(agents[0].description).toBeUndefined()
    expect(agents[0].content).toBe("just body, no frontmatter")
  })

  test("invalid YAML — does not crash, description undefined", async () => {
    const dir = join(tmp, "agents")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "a.md"), "---\n  not valid: : : yaml:\n---\nbody")

    const adapter = new GenericMCPAdapter(makeDef(dir))
    const agents = await adapter.getAgentFiles("global")

    expect(agents).toHaveLength(1)
    expect(agents[0].description).toBeUndefined()
  })

  test("ignores non-.md files", async () => {
    const dir = join(tmp, "agents")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "a.md"), "---\nname: a\n---\nbody")
    writeFileSync(join(dir, "b.txt"), "not an agent")
    writeFileSync(join(dir, ".DS_Store"), "mac junk")

    const adapter = new GenericMCPAdapter(makeDef(dir))
    const agents = await adapter.getAgentFiles("global")

    expect(agents).toHaveLength(1)
    expect(agents[0].name).toBe("a.md")
  })

  test("missing directory — returns empty", async () => {
    const adapter = new GenericMCPAdapter(makeDef(join(tmp, "nonexistent")))
    const agents = await adapter.getAgentFiles("global")
    expect(agents).toEqual([])
  })

  test("reads project scope when projectRoot provided", async () => {
    const projectRoot = join(tmp, "proj")
    const dir = join(projectRoot, ".test", "agents")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "p.md"), "---\nname: p\n---\nproject agent")

    const adapter = new GenericMCPAdapter(makeDef(join(tmp, "unused")), projectRoot)
    const agents = await adapter.getAgentFiles("project")

    expect(agents).toHaveLength(1)
    expect(agents[0]._scope).toBe("project")
  })

  test("unicode in names and content", async () => {
    const dir = join(tmp, "agents")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "エージェント.md"), "---\nname: агент\ndescription: Описание\n---\n日本語")

    const adapter = new GenericMCPAdapter(makeDef(dir))
    const agents = await adapter.getAgentFiles("global")

    expect(agents[0].name).toBe("エージェント.md")
    expect(agents[0].description).toBe("Описание")
    expect(agents[0].content).toContain("日本語")
  })
})

describe("GenericMCPAdapter.writeAgentFile", () => {
  test("creates nested directories", async () => {
    const targetPath = join(tmp, "deeply", "nested", "agents", "new.md")
    const adapter = new GenericMCPAdapter(makeDef(join(tmp, "unused")))
    await adapter.writeAgentFile("---\nname: new\n---\nbody", targetPath)

    const content = await Bun.file(targetPath).text()
    expect(content).toBe("---\nname: new\n---\nbody")
  })

  test("overwrites existing file", async () => {
    const dir = join(tmp, "agents")
    mkdirSync(dir, { recursive: true })
    const targetPath = join(dir, "existing.md")
    writeFileSync(targetPath, "old content")

    const adapter = new GenericMCPAdapter(makeDef(dir))
    await adapter.writeAgentFile("new content", targetPath)

    const content = await Bun.file(targetPath).text()
    expect(content).toBe("new content")
  })

  test("roundtrip: scan -> write -> scan preserves content", async () => {
    const dir = join(tmp, "agents")
    mkdirSync(dir, { recursive: true })
    const original = "---\nname: rt\ndescription: Roundtrip\ntools:\n  - Read\n  - Grep\n---\n\n# Roundtrip test\n\nbody ⭐"
    writeFileSync(join(dir, "rt.md"), original)

    const adapter = new GenericMCPAdapter(makeDef(dir))
    const agents = await adapter.getAgentFiles("global")

    const targetPath = join(tmp, "copied.md")
    await adapter.writeAgentFile(agents[0].content, targetPath)

    const roundtripped = await Bun.file(targetPath).text()
    expect(roundtripped).toBe(original)
  })
})
