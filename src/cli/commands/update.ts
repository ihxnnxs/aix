import type { CommandModule } from "yargs"
import { VERSION } from "../../version"
import { checkForUpdate, compareVersions } from "../../utils/update"

const REPO = "ihxnnxs/aix"

export const UpdateCommand: CommandModule = {
  command: "update",
  describe: "Update aix to the latest version",
  handler: async () => {
    console.log()
    console.log(`  aix v${VERSION}`)
    console.log(`  Checking for updates...`)

    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.log(`  ✗ Failed to check for updates`)
      console.log()
      return
    }

    const data = (await res.json()) as { tag_name: string; assets: Array<{ name: string; browser_download_url: string }> }
    const latest = data.tag_name.replace(/^v/, "")

    if (!compareVersions(VERSION, latest)) {
      console.log(`  ✓ Already up to date`)
      console.log()
      return
    }

    console.log(`  ⚠ Update available: v${VERSION} -> v${latest}`)

    const os = process.platform === "darwin" ? "darwin" : process.platform === "win32" ? "windows" : "linux"
    const arch = process.arch === "arm64" ? "arm64" : "x64"
    const ext = os === "windows" ? ".zip" : ".tar.gz"
    const assetName = `aix-${os}-${arch}${ext}`

    const asset = data.assets.find((a) => a.name === assetName)
    if (!asset) {
      console.log(`  ✗ No binary found for ${os}-${arch}`)
      console.log(`  Run manually: curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash`)
      console.log()
      return
    }

    console.log(`  Downloading ${assetName}...`)

    const binPath = process.execPath
    const { mkdtempSync } = await import("node:fs")
    const { join } = await import("node:path")
    const { tmpdir } = await import("node:os")
    const { execSync } = await import("node:child_process")

    const tmp = mkdtempSync(join(tmpdir(), "aix-update-"))

    try {
      const dlRes = await fetch(asset.browser_download_url, { signal: AbortSignal.timeout(60000) })
      if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`)

      const buf = await dlRes.arrayBuffer()
      const archivePath = join(tmp, assetName)
      await Bun.write(archivePath, buf)

      if (os === "windows") {
        execSync(`powershell -Command "Expand-Archive -Force '${archivePath}' '${tmp}'"`)
      } else {
        execSync(`tar xzf "${archivePath}" -C "${tmp}"`)
      }

      const newBin = join(tmp, os === "windows" ? "aix.exe" : "aix")
      const { copyFileSync, chmodSync } = await import("node:fs")
      copyFileSync(newBin, binPath)
      if (os !== "windows") chmodSync(binPath, 0o755)

      console.log(`  ✓ Updated to v${latest}`)
    } catch (e) {
      console.log(`  ✗ Update failed: ${e instanceof Error ? e.message : e}`)
      console.log(`  Run manually: curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash`)
    } finally {
      const { rmSync } = await import("node:fs")
      rmSync(tmp, { recursive: true, force: true })
    }

    console.log()
  },
}
