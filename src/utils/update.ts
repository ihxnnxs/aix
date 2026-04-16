import { KVStore } from "../config/store"
import { VERSION } from "../version"

export interface UpdateInfo {
  current: string
  latest: string
  url: string
}

const CHECK_INTERVAL = 60 * 60 * 1000
const REPO = "ihxnnxs/aix"

export function compareVersions(current: string, latest: string): boolean {
  const c = current.replace(/^v/, "").split(".").map(Number)
  const l = latest.replace(/^v/, "").split(".").map(Number)
  for (let i = 0; i < 3; i++) {
    if ((l[i] ?? 0) > (c[i] ?? 0)) return true
    if ((l[i] ?? 0) < (c[i] ?? 0)) return false
  }
  return false
}

export function shouldCheck(store: KVStore): boolean {
  const last = store.get<number>("lastUpdateCheck")
  if (!last) return true
  return Date.now() - last > CHECK_INTERVAL
}

export async function checkForUpdate(store?: KVStore): Promise<UpdateInfo | null> {
  const kvStore = store ?? new KVStore()

  if (!shouldCheck(kvStore)) {
    const cached = kvStore.get<string>("latestVersion")
    if (cached && compareVersions(VERSION, cached)) {
      return {
        current: VERSION,
        latest: cached,
        url: `https://github.com/${REPO}/releases/tag/v${cached}`,
      }
    }
    return null
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { "Accept": "application/vnd.github+json" },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null

    const data = await res.json() as { tag_name: string }
    const latest = data.tag_name.replace(/^v/, "")

    kvStore.set("lastUpdateCheck", Date.now())
    kvStore.set("latestVersion", latest)

    if (compareVersions(VERSION, latest)) {
      return {
        current: VERSION,
        latest,
        url: `https://github.com/${REPO}/releases/tag/v${latest}`,
      }
    }
    return null
  } catch {
    return null
  }
}

export async function performUpdate(targetVersion: string): Promise<boolean> {
  const os = process.platform === "darwin" ? "darwin" : process.platform === "win32" ? "windows" : "linux"
  const arch = process.arch === "arm64" ? "arm64" : "x64"
  const ext = os === "windows" ? ".zip" : ".tar.gz"
  const assetName = `aix-${os}-${arch}${ext}`
  const url = `https://github.com/${REPO}/releases/download/v${targetVersion}/${assetName}`

  try {
    const { mkdtempSync, copyFileSync, chmodSync, rmSync } = await import("node:fs")
    const { join } = await import("node:path")
    const { tmpdir } = await import("node:os")
    const { execSync } = await import("node:child_process")

    const tmp = mkdtempSync(join(tmpdir(), "aix-update-"))

    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(120000) })
      if (!res.ok) return false

      const buf = await res.arrayBuffer()
      const archivePath = join(tmp, assetName)
      await Bun.write(archivePath, buf)

      if (os === "windows") {
        execSync(`powershell -Command "Expand-Archive -Force '${archivePath}' '${tmp}'"`)
      } else {
        execSync(`tar xzf "${archivePath}" -C "${tmp}"`)
      }

      const newBin = join(tmp, os === "windows" ? "aix.exe" : "aix")
      const binPath = process.execPath
      copyFileSync(newBin, binPath)
      if (os !== "windows") chmodSync(binPath, 0o755)

      return true
    } finally {
      const { rmSync } = await import("node:fs")
      rmSync(tmp, { recursive: true, force: true })
    }
  } catch {
    return false
  }
}
