import { test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import type { CLIDef } from "../../src/adapters/detector"
import { GenericMCPAdapter } from "../../src/adapters/generic"

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "aix-skills-"))
})

afterEach(() => {
  rmSync(tmp, { recursive: true })
})

const skillsDef: CLIDef = {
  id: "skills-test",
  name: "Skills Test",
  icon: "ST",
  paths: () => [join(tmp, "config.json")],
  skillsPath: () => [join(tmp, "skills")],
  projectSkillsPath: (root) => [join(root, ".test", "skills")],
}

test("reads skills from subdirectories with SKILL.md", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  mkdirSync(join(tmp, "skills", "my-skill"), { recursive: true })
  writeFileSync(join(tmp, "skills", "my-skill", "SKILL.md"), `---
name: my-skill
description: A test skill
---

Do something useful.
`)
  const adapter = new GenericMCPAdapter(skillsDef, null)
  await adapter.detect()
  const skills = await adapter.getSkillFiles("global")
  expect(skills).toHaveLength(1)
  expect(skills[0].name).toBe("my-skill")
  expect(skills[0].description).toBe("A test skill")
  expect(skills[0]._scope).toBe("global")
  expect(skills[0]._source).toBe("skills-test")
})

test("reads multiple skills from subdirectories", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  mkdirSync(join(tmp, "skills", "skill-a"), { recursive: true })
  mkdirSync(join(tmp, "skills", "skill-b"), { recursive: true })
  writeFileSync(join(tmp, "skills", "skill-a", "SKILL.md"), "# Skill A")
  writeFileSync(join(tmp, "skills", "skill-b", "SKILL.md"), "# Skill B")
  const adapter = new GenericMCPAdapter(skillsDef, null)
  await adapter.detect()
  const skills = await adapter.getSkillFiles("global")
  expect(skills).toHaveLength(2)
  expect(skills.map((s) => s.name).sort()).toEqual(["skill-a", "skill-b"])
})

test("ignores directories without SKILL.md", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  mkdirSync(join(tmp, "skills", "has-skill"), { recursive: true })
  mkdirSync(join(tmp, "skills", "no-skill"), { recursive: true })
  writeFileSync(join(tmp, "skills", "has-skill", "SKILL.md"), "content")
  writeFileSync(join(tmp, "skills", "no-skill", "README.md"), "not a skill")
  const adapter = new GenericMCPAdapter(skillsDef, null)
  await adapter.detect()
  const skills = await adapter.getSkillFiles("global")
  expect(skills).toHaveLength(1)
  expect(skills[0].name).toBe("has-skill")
})

test("returns empty array when no skills directory", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  const adapter = new GenericMCPAdapter(skillsDef, null)
  await adapter.detect()
  const skills = await adapter.getSkillFiles()
  expect(skills).toHaveLength(0)
})

test("reads project-scoped skills", async () => {
  const projDir = join(tmp, "project")
  mkdirSync(join(projDir, ".test", "skills", "proj-skill"), { recursive: true })
  writeFileSync(join(tmp, "config.json"), "{}")
  writeFileSync(join(projDir, ".test", "skills", "proj-skill", "SKILL.md"), "project skill")
  const adapter = new GenericMCPAdapter(skillsDef, projDir)
  await adapter.detect()
  const skills = await adapter.getSkillFiles("project")
  expect(skills).toHaveLength(1)
  expect(skills[0].name).toBe("proj-skill")
  expect(skills[0]._scope).toBe("project")
})

test("reads both scopes with scope=all", async () => {
  const projDir = join(tmp, "project")
  mkdirSync(join(tmp, "skills", "global-skill"), { recursive: true })
  mkdirSync(join(projDir, ".test", "skills", "project-skill"), { recursive: true })
  writeFileSync(join(tmp, "config.json"), "{}")
  writeFileSync(join(tmp, "skills", "global-skill", "SKILL.md"), "global skill")
  writeFileSync(join(projDir, ".test", "skills", "project-skill", "SKILL.md"), "project skill")
  const adapter = new GenericMCPAdapter(skillsDef, projDir)
  await adapter.detect()
  const skills = await adapter.getSkillFiles("all")
  expect(skills).toHaveLength(2)
  expect(skills.find((s) => s._scope === "global")).toBeTruthy()
  expect(skills.find((s) => s._scope === "project")).toBeTruthy()
})

test("parses description from frontmatter", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  mkdirSync(join(tmp, "skills", "described"), { recursive: true })
  writeFileSync(join(tmp, "skills", "described", "SKILL.md"), `---
name: described
description: This skill does things
---

Content here.
`)
  const adapter = new GenericMCPAdapter(skillsDef, null)
  await adapter.detect()
  const skills = await adapter.getSkillFiles("global")
  expect(skills[0].description).toBe("This skill does things")
})

test("parses quoted description from frontmatter", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  mkdirSync(join(tmp, "skills", "quoted"), { recursive: true })
  writeFileSync(join(tmp, "skills", "quoted", "SKILL.md"), `---
name: quoted
description: "A quoted description"
---

Content.
`)
  const adapter = new GenericMCPAdapter(skillsDef, null)
  await adapter.detect()
  const skills = await adapter.getSkillFiles("global")
  expect(skills[0].description).toBe("A quoted description")
})

test("description is undefined without frontmatter", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  mkdirSync(join(tmp, "skills", "plain"), { recursive: true })
  writeFileSync(join(tmp, "skills", "plain", "SKILL.md"), "# Just a plain file\n\nNo frontmatter.")
  const adapter = new GenericMCPAdapter(skillsDef, null)
  await adapter.detect()
  const skills = await adapter.getSkillFiles("global")
  expect(skills[0].description).toBeUndefined()
})

test("writes skill file", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  const adapter = new GenericMCPAdapter(skillsDef, null)
  await adapter.detect()
  const targetPath = join(tmp, "output", "skills", "new-skill", "SKILL.md")
  await adapter.writeSkillFile("skill content", targetPath)
  const content = await Bun.file(targetPath).text()
  expect(content).toBe("skill content")
})

test("writeSkillFile creates parent directories", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  const adapter = new GenericMCPAdapter(skillsDef, null)
  await adapter.detect()
  const targetPath = join(tmp, "deep", "nested", "skills", "skill", "SKILL.md")
  await adapter.writeSkillFile("nested skill", targetPath)
  const content = await Bun.file(targetPath).text()
  expect(content).toBe("nested skill")
})

test("also reads flat .md files as skills", async () => {
  writeFileSync(join(tmp, "config.json"), "{}")
  mkdirSync(join(tmp, "skills"), { recursive: true })
  writeFileSync(join(tmp, "skills", "flat-skill.md"), "flat skill content")
  const adapter = new GenericMCPAdapter(skillsDef, null)
  await adapter.detect()
  const skills = await adapter.getSkillFiles("global")
  expect(skills).toHaveLength(1)
  expect(skills[0].name).toBe("flat-skill.md")
})
