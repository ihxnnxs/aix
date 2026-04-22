import { test, expect } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { BackupManager } from "../../src/config/backup"

test("transfer creates backup, restore rolls back", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "aix-tr-"))
  try {
    const home = join(tmp, "home")
    const cursorAgents = join(home, ".cursor", "agents")
    mkdirSync(cursorAgents, { recursive: true })
    const targetPath = join(cursorAgents, "existing.md")
    writeFileSync(targetPath, "ORIGINAL")

    const prevHome = process.env.HOME
    process.env.HOME = home

    try {
      const backupDir = join(home, ".config", "aix", "backups")
      const mgr = new BackupManager(backupDir)
      const backupId = await mgr.create("cursor", targetPath)

      writeFileSync(targetPath, "OVERWRITTEN BY TRANSFER")

      await mgr.restore(backupId)

      const content = await Bun.file(targetPath).text()
      expect(content).toBe("ORIGINAL")
    } finally {
      if (prevHome !== undefined) process.env.HOME = prevHome
      else delete process.env.HOME
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})
