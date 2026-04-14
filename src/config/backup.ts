import { join } from "node:path"
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
    const id = now.toISOString().replace(/:/g, "-")
    const backupDir = join(this.dir, id)

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
    const backupDir = join(this.dir, backupId)
    if (!existsSync(backupDir)) {
      throw new Error(`Backup not found: ${backupId}`)
    }

    const metaFile = Bun.file(join(backupDir, "metadata.json"))
    const metadata: BackupMetadata = await metaFile.json()

    const files = readdirSync(backupDir).filter((f) => f !== "metadata.json")
    if (files.length === 0) {
      throw new Error(`No config file in backup: ${backupId}`)
    }

    const backupPath = join(backupDir, files[0])
    const content = await Bun.file(backupPath).text()
    await Bun.write(metadata.originalPath, content)
  }

  async list(): Promise<BackupEntry[]> {
    if (!existsSync(this.dir)) return []

    const entries: BackupEntry[] = []

    for (const id of readdirSync(this.dir)) {
      const backupDir = join(this.dir, id)
      const metaPath = join(backupDir, "metadata.json")
      if (!existsSync(metaPath)) continue

      const metadata: BackupMetadata = await Bun.file(metaPath).json()
      const files = readdirSync(backupDir).filter((f) => f !== "metadata.json")
      if (files.length === 0) continue

      entries.push({
        id,
        adapterId: metadata.adapterId,
        originalPath: metadata.originalPath,
        backupPath: join(backupDir, files[0]),
        createdAt: new Date(metadata.createdAt),
      })
    }

    return entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  async prune(maxAgeDays: number = 30): Promise<number> {
    const entries = await this.list()
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
    let removed = 0

    for (const entry of entries) {
      if (entry.createdAt.getTime() <= cutoff) {
        rmSync(join(this.dir, entry.id), { recursive: true, force: true })
        removed++
      }
    }

    return removed
  }
}
