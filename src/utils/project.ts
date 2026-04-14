import { existsSync } from "node:fs"
import { join, dirname } from "node:path"

export function findProjectRoot(cwd: string): string | null {
  let dir = cwd
  while (true) {
    if (existsSync(join(dir, ".git"))) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}
