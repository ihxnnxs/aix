import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs"
import { join, dirname, resolve } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"
import { BackupManager } from "../../src/config/backup"

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..")

let tmp: string
let backupDir: string
let home: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "aix-restore-"))
  home = join(tmp, "home")
  backupDir = join(home, ".config", "aix", "backups")
  mkdirSync(backupDir, { recursive: true })
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

test("aix restore <id> restores file", async () => {
  const target = join(tmp, "config.json")
  writeFileSync(target, "original content")
  const mgr = new BackupManager(backupDir)
  const id = await mgr.create("test-tool", target)

  writeFileSync(target, "corrupted")

  const proc = Bun.spawn([
    "bun", "run", "src/index.ts", "restore", id,
  ], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, HOME: home },
    stdout: "pipe", stderr: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited

  expect(proc.exitCode).toBe(0)
  expect(stdout).toContain("Restored")

  const restored = await Bun.file(target).text()
  expect(restored).toBe("original content")
})

test("aix restore <invalid-id> exits 1 with error", async () => {
  const proc = Bun.spawn([
    "bun", "run", "src/index.ts", "restore", "not-a-real-id",
  ], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, HOME: home },
    stdout: "pipe", stderr: "pipe",
  })

  await proc.exited
  expect(proc.exitCode).toBe(1)
  const stderr = await new Response(proc.stderr).text()
  expect(stderr.toLowerCase()).toContain("not found")
})

test("aix restore --list prints entries", async () => {
  const target = join(tmp, "c.json")
  writeFileSync(target, "x")
  const mgr = new BackupManager(backupDir)
  await mgr.create("test-tool", target)

  const proc = Bun.spawn([
    "bun", "run", "src/index.ts", "restore", "--list",
  ], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited

  expect(proc.exitCode).toBe(0)
  expect(stdout).toContain("test-tool")
})

test("aix restore --list empty prints message", async () => {
  const proc = Bun.spawn([
    "bun", "run", "src/index.ts", "restore", "--list",
  ], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited

  expect(proc.exitCode).toBe(0)
  expect(stdout).toContain("No backups")
})

test("aix restore --prune 0 removes all", async () => {
  const target = join(tmp, "c.json")
  writeFileSync(target, "x")
  const mgr = new BackupManager(backupDir)
  await mgr.create("t", target)
  await new Promise((r) => setTimeout(r, 10))
  await mgr.create("t", target)

  const proc = Bun.spawn([
    "bun", "run", "src/index.ts", "restore", "--prune", "0",
  ], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited

  expect(proc.exitCode).toBe(0)
  expect(stdout).toContain("2")
  expect((await mgr.list()).length).toBe(0)
})
