import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs"
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

  test("restore() throws on nonexistent id", async () => {
    const manager = new BackupManager(backupDir)
    await expect(manager.restore("nonexistent-id")).rejects.toThrow("Backup not found")
  })

  test("restore() works when original path was deleted", async () => {
    const manager = new BackupManager(backupDir)
    const original = join(tmpDir, "config.json")
    writeFileSync(original, "content")
    const id = await manager.create("test-tool", original)
    rmSync(original)
    await manager.restore(id)
    expect(await Bun.file(original).text()).toBe("content")
  })

  test("prune(30) removes entries older than cutoff", async () => {
    const manager = new BackupManager(backupDir)
    const original = join(tmpDir, "c.json")
    writeFileSync(original, "x")
    const id = await manager.create("t", original)

    const metaPath = join(backupDir, id, "metadata.json")
    const meta = await Bun.file(metaPath).json()
    meta.createdAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
    await Bun.write(metaPath, JSON.stringify(meta))

    const removed = await manager.prune(30)
    expect(removed).toBe(1)
    expect((await manager.list()).length).toBe(0)
  })

  test("prune(0) removes all entries", async () => {
    const manager = new BackupManager(backupDir)
    const original1 = join(tmpDir, "c1.json")
    const original2 = join(tmpDir, "c2.json")
    writeFileSync(original1, "x")
    writeFileSync(original2, "y")
    await manager.create("t", original1)
    await new Promise((r) => setTimeout(r, 10))
    await manager.create("t", original2)
    const removed = await manager.prune(0)
    expect(removed).toBe(2)
  })

  test("list() returns [] when backups dir missing", async () => {
    const manager = new BackupManager(join(tmpDir, "never-created"))
    expect(await manager.list()).toEqual([])
  })

  test("list() skips entries without metadata.json (partial writes)", async () => {
    const manager = new BackupManager(backupDir)
    const original = join(tmpDir, "c.json")
    writeFileSync(original, "x")
    await manager.create("t", original)

    mkdirSync(join(backupDir, "stray-dir"), { recursive: true })
    writeFileSync(join(backupDir, "stray-dir", "config.json"), "stray")

    const entries = await manager.list()
    expect(entries.length).toBe(1)
  })

  test("list() sorts by createdAt ascending", async () => {
    const manager = new BackupManager(backupDir)
    const original = join(tmpDir, "c.json")
    writeFileSync(original, "x")

    const id1 = await manager.create("t", original)
    await new Promise((r) => setTimeout(r, 10))
    const id2 = await manager.create("t", original)

    const entries = await manager.list()
    expect(entries[0].id).toBe(id1)
    expect(entries[1].id).toBe(id2)
  })
})
