import { afterEach, beforeEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve, dirname } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const ENTRYPOINT = join(PROJECT_ROOT, "src", "index.ts")

let tmp: string
let home: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "aix-list-"))
  home = join(tmp, "home")
  mkdirSync(home, { recursive: true })
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

test("aix list --json prints sanitized tool inventory", async () => {
  writeFileSync(join(home, ".claude.json"), JSON.stringify({
    mcpServers: {
      context7: {
        command: "bun",
        args: ["x", "@upstash/context7"],
        env: { SECRET_TOKEN: "do-not-print" },
      },
    },
  }))

  const proc = Bun.spawn(["bun", "run", ENTRYPOINT, "list", "--json", "--scope", "global"], {
    cwd: tmp,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
    stderr: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited

  expect(proc.exitCode).toBe(0)
  expect(stdout).not.toContain("do-not-print")

  const parsed = JSON.parse(stdout)
  const claude = parsed.tools.find((tool: any) => tool.id === "claude-code")
  expect(claude.installed).toBe(true)
  expect(claude.counts.mcp).toBe(1)
  expect(claude.mcp[0].name).toBe("context7")
  expect(claude.mcp[0].envKeys).toEqual(["SECRET_TOKEN"])
})

test("aix list --type skills filters text output", async () => {
  const skillDir = join(home, ".claude", "skills", "planner")
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, "SKILL.md"), "---\ndescription: Plans work\n---\nbody")
  writeFileSync(join(home, ".claude.json"), JSON.stringify({ mcpServers: { hidden: { command: "bun" } } }))

  const proc = Bun.spawn(["bun", "run", ENTRYPOINT, "list", "--type", "skills", "--scope", "global"], {
    cwd: tmp,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
    stderr: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  await proc.exited

  expect(proc.exitCode).toBe(0)
  expect(stdout).toContain("Skills (1)")
  expect(stdout).toContain("planner")
  expect(stdout).not.toContain("MCP (")
  expect(stdout).not.toContain("hidden")
})
