import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, statSync } from "node:fs"
import { join, dirname, resolve } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..")

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "aix-cli-"))
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

test("transfer --dry-run prints plan without writing", async () => {
  const claudeDir = join(tmp, "home", ".claude", "agents")
  mkdirSync(claudeDir, { recursive: true })
  writeFileSync(join(claudeDir, "planner.md"), "---\nname: planner\n---\nbody")

  const cursorDir = join(tmp, "home", ".cursor", "agents")
  mkdirSync(cursorDir, { recursive: true })
  const targetFile = join(cursorDir, "planner.md")

  const proc = Bun.spawn([
    "bun", "run", "src/index.ts",
    "transfer",
    "--from", "claude-code",
    "--to", "cursor",
    "--type", "agents",
    "--name", "planner.md",
    "--dry-run",
  ], {
    env: { ...process.env, HOME: join(tmp, "home") },
    stdout: "pipe",
    stderr: "pipe",
    cwd: PROJECT_ROOT,
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited

  expect(proc.exitCode).toBe(0)
  expect(stdout).toContain("[DRY-RUN]")
  expect(stdout).toContain("planner.md")

  expect(() => statSync(targetFile)).toThrow()
})

test("transfer --dry-run for rules prints plan", async () => {
  const claudeDir = join(tmp, "home", ".claude")
  mkdirSync(claudeDir, { recursive: true })
  writeFileSync(join(claudeDir, "CLAUDE.md"), "# My rules\nBe precise.")

  const proc = Bun.spawn([
    "bun", "run", "src/index.ts",
    "transfer", "--from", "claude-code", "--to", "cursor",
    "--type", "rules", "--name", "CLAUDE.md", "--dry-run",
  ], {
    env: { ...process.env, HOME: join(tmp, "home") },
    stdout: "pipe", stderr: "pipe",
    cwd: PROJECT_ROOT,
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited
  expect(proc.exitCode).toBe(0)
  expect(stdout).toContain("[DRY-RUN]")
})

test("transfer --dry-run for skills prints plan", async () => {
  const skillDir = join(tmp, "home", ".claude", "skills", "my-skill")
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, "SKILL.md"), "---\nname: my-skill\n---\nbody")

  const proc = Bun.spawn([
    "bun", "run", "src/index.ts",
    "transfer", "--from", "claude-code", "--to", "cursor",
    "--type", "skills", "--name", "my-skill", "--dry-run",
  ], {
    env: { ...process.env, HOME: join(tmp, "home") },
    stdout: "pipe", stderr: "pipe",
    cwd: PROJECT_ROOT,
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited
  expect(proc.exitCode).toBe(0)
  expect(stdout).toContain("[DRY-RUN]")
})
