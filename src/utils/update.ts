import { KVStore } from "../config/store"
import { VERSION } from "../version"

export interface UpdateInfo {
  current: string
  latest: string
  url: string
}

const CHECK_INTERVAL = 24 * 60 * 60 * 1000
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
      signal: AbortSignal.timeout(5000),
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
