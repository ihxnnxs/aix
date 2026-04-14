import { test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "aix-test-"))
})

afterEach(() => {
  rmSync(tmp, { recursive: true })
})

test("finds .git in current directory", async () => {
  const { findProjectRoot } = await import("../../src/utils/project")
  mkdirSync(join(tmp, ".git"))
  expect(findProjectRoot(tmp)).toBe(tmp)
})

test("finds .git in parent directory", async () => {
  const { findProjectRoot } = await import("../../src/utils/project")
  mkdirSync(join(tmp, ".git"))
  const sub = join(tmp, "src", "deep")
  mkdirSync(sub, { recursive: true })
  expect(findProjectRoot(sub)).toBe(tmp)
})

test("returns null when no .git found", async () => {
  const { findProjectRoot } = await import("../../src/utils/project")
  expect(findProjectRoot(tmp)).toBeNull()
})
