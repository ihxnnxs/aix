import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { BackupManager } from "../../src/config/backup"

let tmpDir: string
let backupDir: string
let configDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), ".tmp-aix-backup-"))
  backupDir = join(tmpDir, "backups")
  configDir = join(tmpDir, "configs")
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe("BackupManager", () => {
  test("creates backup and lists it", async () => {
    const configPath = join(configDir, "cursor.json")
    await Bun.write(configPath, JSON.stringify({ mcpServers: { test: {} } }, null, 2))

    const manager = new BackupManager(backupDir)
    const id = await manager.create("cursor", configPath)

    expect(id).toBeTruthy()

    const entries = await manager.list()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe(id)
    expect(entries[0].adapterId).toBe("cursor")
    expect(entries[0].originalPath).toBe(configPath)
    expect(entries[0].createdAt).toBeInstanceOf(Date)

    const backupContent = await Bun.file(entries[0].backupPath).text()
    const original = await Bun.file(configPath).text()
    expect(backupContent).toBe(original)
  })

  test("restores backup overwrites current config", async () => {
    const configPath = join(configDir, "cursor.json")
    const originalData = JSON.stringify({ mcpServers: { original: {} } }, null, 2)
    await Bun.write(configPath, originalData)

    const manager = new BackupManager(backupDir)
    const id = await manager.create("cursor", configPath)

    const newData = JSON.stringify({ mcpServers: { replaced: {} } }, null, 2)
    await Bun.write(configPath, newData)

    const beforeRestore = await Bun.file(configPath).text()
    expect(beforeRestore).toBe(newData)

    await manager.restore(id)

    const afterRestore = await Bun.file(configPath).text()
    expect(afterRestore).toBe(originalData)
  })

  test("prune removes old backups", async () => {
    const configPath = join(configDir, "cursor.json")
    await Bun.write(configPath, JSON.stringify({ mcpServers: {} }))

    const manager = new BackupManager(backupDir)
    await manager.create("cursor", configPath)

    const before = await manager.list()
    expect(before).toHaveLength(1)

    const removed = await manager.prune(0)
    expect(removed).toBe(1)

    const after = await manager.list()
    expect(after).toHaveLength(0)
  })

  test("restore throws for nonexistent backup", async () => {
    const manager = new BackupManager(backupDir)
    expect(manager.restore("nonexistent-id")).rejects.toThrow("Backup not found")
  })

  test("list returns empty when no backups exist", async () => {
    const manager = new BackupManager(backupDir)
    const entries = await manager.list()
    expect(entries).toHaveLength(0)
  })
})
