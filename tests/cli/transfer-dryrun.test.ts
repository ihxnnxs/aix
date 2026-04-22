import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

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
    cwd: "/home/hxnnxs/Projects/aix",
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited

  expect(proc.exitCode).toBe(0)
  expect(stdout).toContain("[DRY-RUN]")
  expect(stdout).toContain("planner.md")

  expect(() => statSync(targetFile)).toThrow()
})
