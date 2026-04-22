import { test, expect } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..")

test("aix transfer --dry-run makes no fs writes", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "aix-dr-"))
  try {
    const home = join(tmp, "home")
    const claudeAgents = join(home, ".claude", "agents")
    mkdirSync(claudeAgents, { recursive: true })
    writeFileSync(join(claudeAgents, "p.md"), "---\nname: p\n---\nbody")

    const cursorAgents = join(home, ".cursor", "agents")
    mkdirSync(cursorAgents, { recursive: true })
    writeFileSync(join(cursorAgents, "unrelated.md"), "leave me alone")

    const statsBefore = snapshotDir(cursorAgents)
    const backupsBefore = snapshotBackups(home)

    const proc = Bun.spawn([
      "bun", "run", "src/index.ts",
      "transfer", "--from", "claude-code", "--to", "cursor",
      "--type", "agents", "--name", "p.md", "--dry-run",
    ], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, HOME: home },
      stdout: "pipe",
    })
    await proc.exited
    expect(proc.exitCode).toBe(0)

    const statsAfter = snapshotDir(cursorAgents)
    const backupsAfter = snapshotBackups(home)

    expect(statsAfter).toEqual(statsBefore)
    expect(backupsAfter).toEqual(backupsBefore)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

function snapshotDir(dir: string): Record<string, number> {
  const out: Record<string, number> = {}
  try {
    for (const f of readdirSync(dir)) {
      out[f] = statSync(join(dir, f)).mtime.getTime()
    }
  } catch {}
  return out
}

function snapshotBackups(home: string): string[] {
  try {
    return readdirSync(join(home, ".config", "aix", "backups"))
  } catch {
    return []
  }
}
