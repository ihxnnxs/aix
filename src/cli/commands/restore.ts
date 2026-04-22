import type { CommandModule } from "yargs"
import { BackupManager } from "../../config/backup"
import { join } from "node:path"

const backupDir = () => join(process.env.HOME ?? "~", ".config", "aix", "backups")

function exitWithError(msg: string): never {
  console.error(msg)
  process.exit(1)
}

export const RestoreCommand: CommandModule = {
  command: "restore [id]",
  describe: "Restore config from backup",
  builder: (y) => y
    .positional("id", { type: "string", describe: "Backup ID (ISO timestamp)" })
    .option("list", { type: "boolean", default: false, describe: "List backups only" })
    .option("prune", { type: "number", describe: "Delete backups older than N days" }),
  handler: async (args: any) => {
    const mgr = new BackupManager(backupDir())

    if (args.list) {
      const entries = await mgr.list()
      if (entries.length === 0) {
        console.log("No backups found")
        return
      }
      for (const e of entries) {
        const age = formatAge(e.createdAt)
        console.log(`  ${e.id} · ${e.adapterId} · ${e.originalPath} (${age})`)
      }
      return
    }

    if (args.prune !== undefined) {
      const removed = await mgr.prune(args.prune)
      console.log(`Removed ${removed} backup${removed === 1 ? "" : "s"} older than ${args.prune} day${args.prune === 1 ? "" : "s"}`)
      return
    }

    if (args.id) {
      try {
        await mgr.restore(args.id)
        const entries = await mgr.list()
        const entry = entries.find((e) => e.id === args.id)
        console.log(`Restored ${entry?.originalPath ?? args.id}`)
      } catch (e) {
        exitWithError(e instanceof Error ? e.message : String(e))
      }
      return
    }

    const entries = await mgr.list()
    if (entries.length === 0) {
      console.log("No backups found")
      return
    }
    console.log("Available backups:")
    entries.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.id} · ${e.adapterId} · ${e.originalPath}`)
    })

    const readline = await import("node:readline")
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const answer = await new Promise<string>((r) => rl.question(`Select [1-${entries.length}, q to quit]: `, r))
    rl.close()

    if (answer.trim().toLowerCase() === "q") return
    const n = parseInt(answer.trim(), 10)
    if (!n || n < 1 || n > entries.length) exitWithError("Invalid selection")
    const chosen = entries[n - 1]
    await mgr.restore(chosen.id)
    console.log(`Restored ${chosen.originalPath}`)
  },
}

function formatAge(d: Date): string {
  const ms = Date.now() - d.getTime()
  const hours = Math.floor(ms / (60 * 60 * 1000))
  if (hours < 1) return "<1h ago"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
