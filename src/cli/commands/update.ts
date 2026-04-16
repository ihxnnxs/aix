import type { CommandModule } from "yargs"
import { VERSION } from "../../version"
import { compareVersions, performUpdate } from "../../utils/update"

const REPO = "ihxnnxs/aix"

export const UpdateCommand: CommandModule = {
  command: "update",
  describe: "Update aix to the latest version",
  handler: async () => {
    console.log()
    console.log(`  aix v${VERSION}`)
    console.log(`  Checking for updates...`)

    let latest: string

    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { tag_name: string }
      latest = data.tag_name.replace(/^v/, "")
    } catch (e) {
      console.log(`  x Failed to check: ${e instanceof Error ? e.message : "network error"}`)
      console.log()
      return
    }

    if (!compareVersions(VERSION, latest)) {
      console.log(`  Already up to date`)
      console.log()
      return
    }

    console.log(`  v${VERSION} -> v${latest}`)
    console.log(`  Downloading...`)

    const ok = await performUpdate(latest)

    if (ok) {
      console.log(`  Updated to v${latest}`)
    } else {
      console.log(`  Update failed`)
      console.log(`  Run: curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash`)
    }

    console.log()
  },
}
