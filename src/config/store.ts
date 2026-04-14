import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

export class KVStore {
  private path: string
  private data: Record<string, unknown>

  constructor(path?: string) {
    this.path = path ?? join(process.env.HOME ?? "~", ".config", "aix", "config.json")
    this.data = this.load()
  }

  get<T = unknown>(key: string): T | undefined {
    return this.data[key] as T | undefined
  }

  set(key: string, value: unknown): void {
    this.data[key] = value
    this.save()
  }

  delete(key: string): void {
    delete this.data[key]
    this.save()
  }

  private load(): Record<string, unknown> {
    try {
      const text = readFileSync(this.path, "utf-8")
      return JSON.parse(text)
    } catch {
      return {}
    }
  }

  private save(): void {
    mkdirSync(dirname(this.path), { recursive: true })
    writeFileSync(this.path, JSON.stringify(this.data, null, 2))
  }
}
