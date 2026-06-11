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

test("sha256Hex returns expected digest", async () => {
  const { sha256Hex } = await import("../../src/utils/update")
  expect(sha256Hex(new TextEncoder().encode("aix"))).toBe("0b0b183ca6e7d20761400de5906a0cbfc31a648f134fb7bd5b24c7f63cca98dd")
})

test("parseSha256Checksum supports standard checksum files", async () => {
  const { parseSha256Checksum } = await import("../../src/utils/update")
  const checksum = "DCD5DD9DD3A1F6ADFA9162A9AA55FC9DC8D1838ED29F85A2368B165BF1ABF51B  aix-linux-x64.tar.gz\n"
  expect(parseSha256Checksum(checksum, "aix-linux-x64.tar.gz")).toBe("dcd5dd9dd3a1f6adfa9162a9aa55fc9dc8d1838ed29f85a2368b165bf1abf51b")
})

test("parseSha256Checksum ignores other assets", async () => {
  const { parseSha256Checksum } = await import("../../src/utils/update")
  const checksum = [
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  aix-darwin-arm64.tar.gz",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb  aix-linux-x64.tar.gz",
  ].join("\n")
  expect(parseSha256Checksum(checksum, "aix-linux-x64.tar.gz")).toBe("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
})
