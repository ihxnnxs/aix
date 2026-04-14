import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { KVStore } from "../../src/config/store"

let tmpDir: string
let storePath: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), ".tmp-aix-store-"))
  storePath = join(tmpDir, "config.json")
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe("KVStore", () => {
  test("get returns undefined for missing key", () => {
    const store = new KVStore(storePath)
    expect(store.get("nonexistent")).toBeUndefined()
  })

  test("set and get round-trips", () => {
    const store = new KVStore(storePath)
    store.set("theme", "dark")
    expect(store.get("theme")).toBe("dark")
  })

  test("persists across instances", () => {
    const store1 = new KVStore(storePath)
    store1.set("animations", true)

    const store2 = new KVStore(storePath)
    expect(store2.get("animations")).toBe(true)
  })

  test("delete removes key", () => {
    const store = new KVStore(storePath)
    store.set("key", "value")
    expect(store.get("key")).toBe("value")

    store.delete("key")
    expect(store.get("key")).toBeUndefined()
  })

  test("creates parent directories on save", () => {
    const nested = join(tmpDir, "a", "b", "c", "config.json")
    const store = new KVStore(nested)
    store.set("deep", 42)

    const reloaded = new KVStore(nested)
    expect(reloaded.get("deep")).toBe(42)
  })

  test("handles complex values", () => {
    const store = new KVStore(storePath)
    const value = { nested: [1, 2, 3], flag: true }
    store.set("complex", value)

    const store2 = new KVStore(storePath)
    expect(store2.get("complex")).toEqual(value)
  })
})
