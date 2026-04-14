import { test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { KVStore } from "../../src/config/store"

let tmp: string
let store: KVStore

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "aix-update-"))
  store = new KVStore(join(tmp, "config.json"))
})

afterEach(() => {
  rmSync(tmp, { recursive: true })
})

test("compareVersions: newer version detected", async () => {
  const { compareVersions } = await import("../../src/utils/update")
  expect(compareVersions("0.1.0", "0.2.0")).toBe(true)
  expect(compareVersions("0.1.0", "1.0.0")).toBe(true)
  expect(compareVersions("0.1.0", "0.1.1")).toBe(true)
})

test("compareVersions: same or older version", async () => {
  const { compareVersions } = await import("../../src/utils/update")
  expect(compareVersions("0.1.0", "0.1.0")).toBe(false)
  expect(compareVersions("0.2.0", "0.1.0")).toBe(false)
})

test("shouldCheck: returns true when no previous check", async () => {
  const { shouldCheck } = await import("../../src/utils/update")
  expect(shouldCheck(store)).toBe(true)
})

test("shouldCheck: returns false within 24h", async () => {
  const { shouldCheck } = await import("../../src/utils/update")
  store.set("lastUpdateCheck", Date.now())
  expect(shouldCheck(store)).toBe(false)
})

test("shouldCheck: returns true after 24h", async () => {
  const { shouldCheck } = await import("../../src/utils/update")
  store.set("lastUpdateCheck", Date.now() - 25 * 60 * 60 * 1000)
  expect(shouldCheck(store)).toBe(true)
})
