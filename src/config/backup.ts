import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import { mkdirSync, existsSync, readdirSync, rmSync } from "node:fs"

export interface BackupEntry {
  id: string
  adapterId: string
  originalPath: string
  backupPath: string
  createdAt: Date
}

interface BackupMetadata {
  adapterId: string
  originalPath: string
  createdAt: string
}

export class BackupManager {
  private dir: string

  constructor(dir?: string) {
    this.dir = dir ?? join(process.env.HOME ?? "~", ".config", "aix", "backups")
  }

  async create(adapterId: string, configPath: string): Promise<string> {
    const now = new Date()
    const id = this.createBackupId(now)
    const backupDir = this.resolveBackupDir(id)

    mkdirSync(backupDir, { recursive: true })

    const fileName = configPath.split("/").pop() ?? "config.json"
    const backupPath = join(backupDir, fileName)

    const source = Bun.file(configPath)
    const content = await source.text()
    await Bun.write(backupPath, content)

    const metadata: BackupMetadata = {
      adapterId,
      originalPath: configPath,
      createdAt: now.toISOString(),
    }
    await Bun.write(join(backupDir, "metadata.json"), JSON.stringify(metadata, null, 2))

    return id
  }

  async restore(backupId: string): Promise<void> {
    const backupDir = this.resolveBackupDir(backupId)
    if (!existsSync(backupDir)) {
      throw new Error(`Backup not found: ${backupId}`)
    }

    const metaFile = Bun.file(join(backupDir, "metadata.json"))
    const metadata: BackupMetadata = await metaFile.json()

    const files = readdirSync(backupDir).filter((f) => f !== "metadata.json")
    if (files.length === 0) {
      throw new Error(`No config file in backup: ${backupId}`)
    }
    this.assertRestorablePath(metadata.originalPath)

    const backupPath = join(backupDir, files[0])
    const content = await Bun.file(backupPath).text()
    if (existsSync(metadata.originalPath)) {
      await this.create(metadata.adapterId, metadata.originalPath)
    }
    mkdirSync(dirname(metadata.originalPath), { recursive: true })
    await Bun.write(metadata.originalPath, content)
  }

  async list(): Promise<BackupEntry[]> {
    if (!existsSync(this.dir)) return []

    const entries: BackupEntry[] = []

    for (const id of readdirSync(this.dir)) {
      const backupDir = this.resolveBackupDir(id)
      const metaPath = join(backupDir, "metadata.json")
      if (!existsSync(metaPath)) continue

      let metadata: BackupMetadata
      try {
        metadata = await Bun.file(metaPath).json()
      } catch {
        continue
      }
      const files = readdirSync(backupDir).filter((f) => f !== "metadata.json")
      if (files.length === 0) continue
      const createdAt = new Date(metadata.createdAt)
      if (!metadata.adapterId || !metadata.originalPath || Number.isNaN(createdAt.getTime())) continue

      entries.push({
        id,
        adapterId: metadata.adapterId,
        originalPath: metadata.originalPath,
        backupPath: join(backupDir, files[0]),
        createdAt,
      })
    }

    return entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  async prune(maxAgeDays: number = 30): Promise<number> {
    if (!Number.isFinite(maxAgeDays) || maxAgeDays <= 0) {
      throw new Error("Prune age must be greater than 0 days")
    }
    const entries = await this.list()
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
    let removed = 0

    for (const entry of entries) {
      if (entry.createdAt.getTime() <= cutoff) {
        rmSync(this.resolveBackupDir(entry.id), { recursive: true, force: true })
        removed++
      }
    }

    return removed
  }

  private createBackupId(now: Date): string {
    const base = now.toISOString().replace(/:/g, "-")
    let id = base
    let suffix = 1

    while (existsSync(this.resolveBackupDir(id))) {
      id = `${base}-${suffix}`
      suffix++
    }

    return id
  }

  private resolveBackupDir(id: string): string {
    if (!id) throw new Error("Invalid backup id")
    const root = resolve(this.dir)
    const backupDir = resolve(root, id)
    const rel = relative(root, backupDir)
    if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
      throw new Error(`Invalid backup id: ${id}`)
    }
    return backupDir
  }

  private assertRestorablePath(path: string): void {
    if (!path || !isAbsolute(path)) {
      throw new Error(`Invalid backup metadata path: ${path}`)
    }
  }
}
