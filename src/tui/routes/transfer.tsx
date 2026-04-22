import { createSignal, createMemo, For, Show } from "solid-js"
import type { RulesFile, SkillFile } from "../../adapters/types"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "../context/theme"
import { useApp, type CLIState } from "../context/app"
import { KEYBINDS, matchKey } from "../context/keybind"
import { StatusBar } from "../components/status-bar"
import { WarningPanel } from "../components/warning-panel"
import { BackupManager } from "../../config/backup"
import { getStrings } from "../i18n"

export function Transfer() {
  const theme = useTheme()
  const [state, actions] = useApp()
  const t = getStrings()

  const installedCLIs = createMemo(() => state.clis.filter((c) => c.detection.installed))

  const [panel, setPanel] = createSignal<"from" | "to">("from")
  const [fromIdx, setFromIdx] = createSignal(0)
  const [toIdx, setToIdx] = createSignal(1)
  const [cursor, setCursor] = createSignal(0)
  const [selected, setSelected] = createSignal<Set<string>>(new Set())
  const [transferring, setTransferring] = createSignal(false)
  const [toastMsg, setToastMsg] = createSignal("")
  const [toastType, setToastType] = createSignal<"success" | "error">("success")
  const [targetScope, setTargetScope] = createSignal<"global" | "project">("global")
  const [tab, setTab] = createSignal<"mcp" | "rules" | "skills" | "agents">("mcp")
  const dims = useTerminalDimensions()
  const visibleRows = createMemo(() => Math.max(5, dims().height - 10))

  const fromCLI = createMemo(() => installedCLIs()[fromIdx()])
  const toCLI = createMemo(() => installedCLIs()[toIdx()])

  const warnings = createMemo(() => {
    const warns: Array<{ serverName: string; message: string }> = []
    const from = fromCLI()
    const to = toCLI()
    if (!from || !to) return warns
    for (const name of selected()) {
      const server = from.servers.find((s) => s.name === name)
      if (!server) continue
      if (server._raw.oauth && to.adapter.id !== "claude-code") {
        warns.push({ serverName: name, message: "oauth field will be dropped" })
      }
      if (server._raw.alwaysAllow && to.adapter.id !== "cline") {
        warns.push({ serverName: name, message: "alwaysAllow field will be dropped" })
      }
    }
    return warns
  })

  const handleTransfer = async () => {
    const from = fromCLI()
    const to = toCLI()
    if (selected().size === 0 || !from || !to) return
    setTransferring(true)
    setToastMsg("")
    const backup = new BackupManager()
    const detection = await to.adapter.detect()
    if (detection.configPath) {
      await backup.create(to.adapter.id, detection.configPath)
    }
    const scope = to.adapter.hasProjectScope ? targetScope() : "global"
    const ok: string[] = []
    const fail: Array<{ name: string; reason: string }> = []
    for (const name of selected()) {
      const server = from.servers.find((s) => s.name === name)
      if (!server) { fail.push({ name, reason: "not found in source" }); continue }
      try {
        await to.adapter.writeMCPServer(server, scope)
        ok.push(name)
      } catch (e) {
        fail.push({ name, reason: e instanceof Error ? e.message : "unknown error" })
      }
    }
    setSelected(new Set())
    setTransferring(false)
    await actions.refresh()
    const parts: string[] = []
    if (ok.length > 0) parts.push(`✓ ${ok.length} transferred (${scope}): ${ok.join(", ")}`)
    for (const f of fail) parts.push(`✗ ${f.name}: ${f.reason}`)
    setToastType(fail.length > 0 ? "error" : "success")
    setToastMsg(parts.join("  "))
  }

  const handleRulesTransfer = async () => {
    const from = fromCLI()
    const to = toCLI()
    if (selected().size === 0 || !from || !to) return
    setTransferring(true)
    setToastMsg("")

    const ok: string[] = []
    const fail: Array<{ name: string; reason: string }> = []

    for (const name of selected()) {
      const rule = from.rules.find((r) => r.name === name)
      if (!rule) { fail.push({ name, reason: "not found" }); continue }
      try {
        const { getAllCLIDefs } = await import("../../adapters/detector")
        const def = getAllCLIDefs().find((d) => d.id === to.adapter.id)
        if (!def) { fail.push({ name, reason: "unknown target" }); continue }

        let targetPath: string | null = null
        if (def.projectRulesPath && state.projectRoot) {
          const paths = def.projectRulesPath(state.projectRoot)
          targetPath = paths[0]
        } else if (def.rulesPath) {
          targetPath = def.rulesPath()[0]
        }

        if (!targetPath) { fail.push({ name, reason: "no rules path for target" }); continue }

        const { existsSync } = await import("node:fs")
        if (existsSync(targetPath)) {
          const backup = new BackupManager()
          await backup.create(to.adapter.id, targetPath)
        }

        await to.adapter.writeRulesFile(rule.content, targetPath)
        ok.push(name)
      } catch (e) {
        fail.push({ name, reason: e instanceof Error ? e.message : "unknown error" })
      }
    }

    setSelected(new Set())
    setTransferring(false)
    await actions.refresh()
    const parts: string[] = []
    if (ok.length > 0) parts.push(`✓ ${ok.length} transferred: ${ok.join(", ")}`)
    for (const f of fail) parts.push(`✗ ${f.name}: ${f.reason}`)
    setToastType(fail.length > 0 ? "error" : "success")
    setToastMsg(parts.join("  "))
  }

  const handleAgentsTransfer = async () => {
    const from = fromCLI()
    const to = toCLI()
    if (selected().size === 0 || !from || !to) return
    setTransferring(true)
    setToastMsg("")

    const ok: string[] = []
    const fail: Array<{ name: string; reason: string }> = []

    for (const name of selected()) {
      const agent = from.agents.find((a) => a.name === name)
      if (!agent) { fail.push({ name, reason: "not found" }); continue }
      try {
        const { getAllCLIDefs } = await import("../../adapters/detector")
        const def = getAllCLIDefs().find((d) => d.id === to.adapter.id)
        if (!def) { fail.push({ name, reason: "unknown target" }); continue }

        let targetDir: string | null = null
        if (def.projectAgentsPath && state.projectRoot) {
          targetDir = def.projectAgentsPath(state.projectRoot)[0]
        } else if (def.agentsPath) {
          targetDir = def.agentsPath()[0]
        }

        if (!targetDir) { fail.push({ name, reason: "no agents path for target" }); continue }

        const { join } = await import("node:path")
        const targetPath = join(targetDir, agent.name)

        const { existsSync } = await import("node:fs")
        if (existsSync(targetPath)) {
          const backup = new BackupManager()
          await backup.create(to.adapter.id, targetPath)
        }

        await to.adapter.writeAgentFile(agent.content, targetPath)
        ok.push(name)
      } catch (e) {
        fail.push({ name, reason: e instanceof Error ? e.message : "unknown error" })
      }
    }

    setSelected(new Set())
    setTransferring(false)
    await actions.refresh()
    const parts: string[] = []
    if (ok.length > 0) parts.push(`✓ ${ok.length} transferred: ${ok.join(", ")}`)
    for (const f of fail) parts.push(`✗ ${f.name}: ${f.reason}`)
    setToastType(fail.length > 0 ? "error" : "success")
    setToastMsg(parts.join("  "))
  }

  const handleSkillsTransfer = async () => {
    const from = fromCLI()
    const to = toCLI()
    if (selected().size === 0 || !from || !to) return
    setTransferring(true)
    setToastMsg("")

    const ok: string[] = []
    const fail: Array<{ name: string; reason: string }> = []

    for (const name of selected()) {
      const skill = from.skills.find((s) => s.name === name)
      if (!skill) { fail.push({ name, reason: "not found" }); continue }
      try {
        const { getAllCLIDefs } = await import("../../adapters/detector")
        const def = getAllCLIDefs().find((d) => d.id === to.adapter.id)
        if (!def) { fail.push({ name, reason: "unknown target" }); continue }

        let targetDir: string | null = null
        if (def.projectSkillsPath && state.projectRoot) {
          targetDir = def.projectSkillsPath(state.projectRoot)[0]
        } else if (def.skillsPath) {
          targetDir = def.skillsPath()[0]
        }

        if (!targetDir) { fail.push({ name, reason: "no skills path for target" }); continue }

        const { join } = await import("node:path")
        const targetPath = join(targetDir, skill.name, "SKILL.md")

        const { existsSync } = await import("node:fs")
        if (existsSync(targetPath)) {
          const backup = new BackupManager()
          await backup.create(to.adapter.id, targetPath)
        }

        await to.adapter.writeSkillFile(skill.content, targetPath)
        ok.push(name)
      } catch (e) {
        fail.push({ name, reason: e instanceof Error ? e.message : "unknown error" })
      }
    }

    setSelected(new Set())
    setTransferring(false)
    await actions.refresh()
    const parts: string[] = []
    if (ok.length > 0) parts.push(`✓ ${ok.length} transferred: ${ok.join(", ")}`)
    for (const f of fail) parts.push(`✗ ${f.name}: ${f.reason}`)
    setToastType(fail.length > 0 ? "error" : "success")
    setToastMsg(parts.join("  "))
  }

  useKeyboard((key: any) => {
    if (key.name === "1") { setTab("mcp"); setCursor(0); setSelected(new Set()) }
    if (key.name === "2") { setTab("rules"); setCursor(0); setSelected(new Set()) }
    if (key.name === "3") { setTab("skills"); setCursor(0); setSelected(new Set()) }
    if (key.name === "4") { setTab("agents"); setCursor(0); setSelected(new Set()) }
    if (matchKey(key, KEYBINDS.back)) actions.navigate("home")
    if (matchKey(key, KEYBINDS.nextPanel)) { setPanel((p) => p === "from" ? "to" : "from"); setCursor(0) }

    const clis = installedCLIs()
    if (clis.length < 2) return

    if (matchKey(key, KEYBINDS.left) || matchKey(key, KEYBINDS.right)) {
      const dir = matchKey(key, KEYBINDS.right) ? 1 : -1
      if (panel() === "from") {
        let next = (fromIdx() + dir + clis.length) % clis.length
        if (next === toIdx()) next = (next + dir + clis.length) % clis.length
        setFromIdx(next)
      } else {
        let next = (toIdx() + dir + clis.length) % clis.length
        if (next === fromIdx()) next = (next + dir + clis.length) % clis.length
        setToIdx(next)
      }
      setCursor(0)
    }

    if (panel() === "from" && fromCLI()) {
      const items = tab() === "rules" ? fromCLI()!.rules
                  : tab() === "skills" ? fromCLI()!.skills
                  : tab() === "agents" ? fromCLI()!.agents
                  : fromCLI()!.servers
      if (matchKey(key, KEYBINDS.up)) setCursor((c) => Math.max(0, c - 1))
      if (matchKey(key, KEYBINDS.down)) setCursor((c) => Math.min(items.length - 1, c + 1))
      if (matchKey(key, KEYBINDS.toggle) && items[cursor()]) {
        const item = items[cursor()]
        setSelected((s) => {
          const next = new Set(s)
          if (next.has(item.name)) {
            next.delete(item.name)
          } else {
            next.add(item.name)
            if (tab() === "mcp") setTargetScope(item._scope)
          }
          return next
        })
      }
    }

    if (key.name === "s" && state.projectRoot) {
      setTargetScope((s) => s === "global" ? "project" : "global")
    }

    if (matchKey(key, KEYBINDS.select) && selected().size > 0) {
      if (tab() === "rules") handleRulesTransfer()
      else if (tab() === "skills") handleSkillsTransfer()
      else if (tab() === "agents") handleAgentsTransfer()
      else handleTransfer()
    }
  })

  return (
    <box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <box width="100%" height={3} flexDirection="row" alignItems="center" gap={1} paddingLeft={1} paddingRight={1}>
        <box
          border
          borderStyle="rounded"
          borderColor={theme.border}
          paddingLeft={1}
          paddingRight={1}
          onMouseDown={() => actions.navigate("home")}
          onMouseOver={() => {}}
        >
          <text fg={theme.muted}>⮜</text>
        </box>
        <box flexGrow={1} justifyContent="center" flexDirection="row" />
        <box flexDirection="row" gap={0}>
          <box
            paddingLeft={2}
            paddingRight={2}
            backgroundColor={tab() === "mcp" ? theme.accent : theme.border}
            onMouseDown={() => { setTab("mcp"); setCursor(0); setSelected(new Set()) }}
          >
            <text fg={tab() === "mcp" ? theme.bg : theme.muted}>MCP</text>
          </box>
          <box
            paddingLeft={2}
            paddingRight={2}
            backgroundColor={tab() === "rules" ? theme.accent : theme.border}
            onMouseDown={() => { setTab("rules"); setCursor(0); setSelected(new Set()) }}
          >
            <text fg={tab() === "rules" ? theme.bg : theme.muted}>Rules</text>
          </box>
          <box
            paddingLeft={2}
            paddingRight={2}
            backgroundColor={tab() === "skills" ? theme.accent : theme.border}
            onMouseDown={() => { setTab("skills"); setCursor(0); setSelected(new Set()) }}
          >
            <text fg={tab() === "skills" ? theme.bg : theme.muted}>Skills</text>
          </box>
          <box
            paddingLeft={2}
            paddingRight={2}
            backgroundColor={tab() === "agents" ? theme.accent : theme.border}
            onMouseDown={() => { setTab("agents"); setCursor(0); setSelected(new Set()) }}
          >
            <text fg={tab() === "agents" ? theme.bg : theme.muted}>Agents</text>
          </box>
        </box>
        <box flexGrow={1} />
        <Show when={selected().size > 0}>
          <text fg={theme.accent}>{selected().size} {t.selected}</text>
        </Show>
      </box>

      <Show when={tab() === "mcp"}>
        <box flexGrow={1} flexDirection="row">
          {/* FROM panel */}
          <box
            flexGrow={1}
            border
            borderStyle="rounded"
            borderColor={panel() === "from" ? theme.accent : theme.border}
            paddingLeft={1}
            paddingRight={1}
            flexDirection="column"
            onMouseDown={() => setPanel("from")}
          >
            <text fg={theme.muted}>{t.from}</text>
            <Show when={fromCLI()}>
              <box flexDirection="row" gap={1}>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (fromIdx() - 1 + clis.length) % clis.length
                    if (next === toIdx()) next = (next - 1 + clis.length) % clis.length
                    setFromIdx(next)
                  }}
                >⮜</text>
                <text fg={theme.fg}>{fromCLI()!.adapter.name}</text>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (fromIdx() + 1) % clis.length
                    if (next === toIdx()) next = (next + 1) % clis.length
                    setFromIdx(next)
                  }}
                >⮞</text>
              </box>
              <box height={1} />
              <For each={fromCLI()!.servers}>
                {(server, i) => (
                  <text
                    fg={cursor() === i() && panel() === "from" ? theme.accent : theme.fg}
                    onMouseDown={() => {
                      setCursor(i())
                      setPanel("from")
                      const name = server.name
                      setSelected((s) => {
                        const next = new Set(s)
                        next.has(name) ? next.delete(name) : next.add(name)
                        return next
                      })
                    }}
                    onMouseOver={() => { setCursor(i()); setPanel("from") }}
                  >
                    {selected().has(server.name) ? "◉ " : "○ "}{server._scope === "project" ? "[P] " : "[G] "}{server.name}
                  </text>
                )}
              </For>
            </Show>
          </box>

          {/* Arrow / Transfer button */}
          <box width={7} alignItems="center" justifyContent="center">
            <box
              border
              borderStyle="rounded"
              borderColor={selected().size > 0 ? theme.accent : theme.border}
              paddingLeft={1}
              paddingRight={1}
              onMouseDown={() => { if (selected().size > 0) handleTransfer() }}
              onMouseOver={() => {}}
            >
              <text fg={selected().size > 0 ? theme.accent : theme.muted}>{transferring() ? "..." : "►"}</text>
            </box>
          </box>

          {/* TO panel */}
          <box
            flexGrow={1}
            border
            borderStyle="rounded"
            borderColor={panel() === "to" ? theme.accent : theme.border}
            paddingLeft={1}
            paddingRight={1}
            flexDirection="column"
            onMouseDown={() => setPanel("to")}
          >
            <text fg={theme.muted}>{t.to}</text>
            <Show when={toCLI()}>
              <box flexDirection="row" gap={1}>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (toIdx() - 1 + clis.length) % clis.length
                    if (next === fromIdx()) next = (next - 1 + clis.length) % clis.length
                    setToIdx(next)
                  }}
                >⮜</text>
                <text fg={theme.fg}>{toCLI()!.adapter.name}</text>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (toIdx() + 1) % clis.length
                    if (next === fromIdx()) next = (next + 1) % clis.length
                    setToIdx(next)
                  }}
                >⮞</text>
              </box>
              <Show when={state.projectRoot && toCLI()?.adapter.hasProjectScope}>
                <text
                  fg={theme.accent}
                  onMouseDown={() => setTargetScope((s) => s === "global" ? "project" : "global")}
                >
                  → {targetScope()}
                </text>
              </Show>
              <box height={1} />
              <For each={toCLI()!.servers}>
                {(server) => <text fg={theme.fg}><span fg={theme.success}>● </span>{server.name}</text>}
              </For>
            </Show>
          </box>
        </box>
      </Show>

      <Show when={tab() === "rules"}>
        <box flexGrow={1} flexDirection="row">
          {/* FROM rules panel */}
          <box
            flexGrow={1}
            border
            borderStyle="rounded"
            borderColor={panel() === "from" ? theme.accent : theme.border}
            paddingLeft={1}
            paddingRight={1}
            flexDirection="column"
            onMouseDown={() => setPanel("from")}
          >
            <text fg={theme.muted}>{t.from}</text>
            <Show when={fromCLI()}>
              <box flexDirection="row" gap={1}>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (fromIdx() - 1 + clis.length) % clis.length
                    if (next === toIdx()) next = (next - 1 + clis.length) % clis.length
                    setFromIdx(next)
                  }}
                >⮜</text>
                <text fg={theme.fg}>{fromCLI()!.adapter.name}</text>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (fromIdx() + 1) % clis.length
                    if (next === toIdx()) next = (next + 1) % clis.length
                    setFromIdx(next)
                  }}
                >⮞</text>
              </box>
              <box height={1} />
              <Show when={fromCLI()!.rules.length > 0} fallback={<text fg={theme.muted}>no rules</text>}>
                <For each={fromCLI()!.rules}>
                  {(rule, i) => (
                    <text
                      fg={cursor() === i() && panel() === "from" ? theme.accent : theme.fg}
                      onMouseDown={() => {
                        setCursor(i())
                        setPanel("from")
                        setSelected((s) => {
                          const next = new Set(s)
                          next.has(rule.name) ? next.delete(rule.name) : next.add(rule.name)
                          return next
                        })
                      }}
                      onMouseOver={() => { setCursor(i()); setPanel("from") }}
                    >
                      {selected().has(rule.name) ? "◉ " : "○ "}
                      <span fg={theme.muted}>{rule._scope === "project" ? "[P] " : "[G] "}</span>
                      {rule.name}
                      <span fg={theme.muted}> ({rule.lines} lines)</span>
                    </text>
                  )}
                </For>
              </Show>
            </Show>
          </box>

          {/* Arrow */}
          <box width={7} alignItems="center" justifyContent="center">
            <box
              border
              borderStyle="rounded"
              borderColor={selected().size > 0 ? theme.accent : theme.border}
              paddingLeft={1}
              paddingRight={1}
              onMouseDown={() => { if (selected().size > 0) handleRulesTransfer() }}
            >
              <text fg={selected().size > 0 ? theme.accent : theme.muted}>{transferring() ? "..." : "►"}</text>
            </box>
          </box>

          {/* TO rules panel */}
          <box
            flexGrow={1}
            border
            borderStyle="rounded"
            borderColor={panel() === "to" ? theme.accent : theme.border}
            paddingLeft={1}
            paddingRight={1}
            flexDirection="column"
            onMouseDown={() => setPanel("to")}
          >
            <text fg={theme.muted}>{t.to}</text>
            <Show when={toCLI()}>
              <box flexDirection="row" gap={1}>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (toIdx() - 1 + clis.length) % clis.length
                    if (next === fromIdx()) next = (next - 1 + clis.length) % clis.length
                    setToIdx(next)
                  }}
                >⮜</text>
                <text fg={theme.fg}>{toCLI()!.adapter.name}</text>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (toIdx() + 1) % clis.length
                    if (next === fromIdx()) next = (next + 1) % clis.length
                    setToIdx(next)
                  }}
                >⮞</text>
              </box>
              <box height={1} />
              <Show when={toCLI()!.rules.length > 0} fallback={<text fg={theme.muted}>no rules</text>}>
                <For each={toCLI()!.rules}>
                  {(rule) => (
                    <text fg={theme.fg}>
                      <span fg={theme.success}>● </span>
                      {rule.name}
                      <span fg={theme.muted}> ({rule.lines} lines)</span>
                    </text>
                  )}
                </For>
              </Show>
            </Show>
          </box>
        </box>
      </Show>

      <Show when={tab() === "skills"}>
        <box flexGrow={1} flexDirection="row">
          {/* FROM skills panel */}
          <box
            flexGrow={1}
            border
            borderStyle="rounded"
            borderColor={panel() === "from" ? theme.accent : theme.border}
            paddingLeft={1}
            paddingRight={1}
            flexDirection="column"
            onMouseDown={() => setPanel("from")}
          >
            <text fg={theme.muted}>{t.from}</text>
            <Show when={fromCLI()}>
              <box flexDirection="row" gap={1}>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (fromIdx() - 1 + clis.length) % clis.length
                    if (next === toIdx()) next = (next - 1 + clis.length) % clis.length
                    setFromIdx(next)
                  }}
                >⮜</text>
                <text fg={theme.fg}>{fromCLI()!.adapter.name}</text>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (fromIdx() + 1) % clis.length
                    if (next === toIdx()) next = (next + 1) % clis.length
                    setFromIdx(next)
                  }}
                >⮞</text>
              </box>
              <box height={1} />
              <Show when={fromCLI()!.skills.length > 0} fallback={<text fg={theme.muted}>no skills</text>}>
                {(() => {
                  const skills = fromCLI()!.skills
                  const maxVisible = visibleRows()
                  const start = Math.max(0, Math.min(cursor() - Math.floor(maxVisible / 2), skills.length - maxVisible))
                  const end = Math.min(skills.length, start + maxVisible)
                  const visible = skills.slice(start, end)
                  return <>
                    <Show when={start > 0}><text fg={theme.muted}>  ↑ {start} more</text></Show>
                    <For each={visible}>
                      {(skill, vi) => {
                        const i = () => start + vi()
                        return (
                          <text
                            fg={cursor() === i() && panel() === "from" ? theme.accent : theme.fg}
                            onMouseDown={() => {
                              setCursor(i())
                              setPanel("from")
                              setSelected((s) => {
                                const next = new Set(s)
                                next.has(skill.name) ? next.delete(skill.name) : next.add(skill.name)
                                return next
                              })
                            }}
                            onMouseOver={() => { setCursor(i()); setPanel("from") }}
                          >
                            {selected().has(skill.name) ? "◉ " : "○ "}
                            <span fg={theme.muted}>{skill._scope === "project" ? "[P] " : "[G] "}</span>
                            {skill.name}
                          </text>
                        )
                      }}
                    </For>
                    <Show when={end < skills.length}><text fg={theme.muted}>  ↓ {skills.length - end} more</text></Show>
                  </>
                })()}
              </Show>
            </Show>
          </box>

          {/* Arrow */}
          <box width={7} alignItems="center" justifyContent="center">
            <box
              border
              borderStyle="rounded"
              borderColor={selected().size > 0 ? theme.accent : theme.border}
              paddingLeft={1}
              paddingRight={1}
              onMouseDown={() => { if (selected().size > 0) handleSkillsTransfer() }}
            >
              <text fg={selected().size > 0 ? theme.accent : theme.muted}>{transferring() ? "..." : "►"}</text>
            </box>
          </box>

          {/* TO skills panel */}
          <box
            flexGrow={1}
            border
            borderStyle="rounded"
            borderColor={panel() === "to" ? theme.accent : theme.border}
            paddingLeft={1}
            paddingRight={1}
            flexDirection="column"
            onMouseDown={() => setPanel("to")}
          >
            <text fg={theme.muted}>{t.to}</text>
            <Show when={toCLI()}>
              <box flexDirection="row" gap={1}>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (toIdx() - 1 + clis.length) % clis.length
                    if (next === fromIdx()) next = (next - 1 + clis.length) % clis.length
                    setToIdx(next)
                  }}
                >⮜</text>
                <text fg={theme.fg}>{toCLI()!.adapter.name}</text>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (toIdx() + 1) % clis.length
                    if (next === fromIdx()) next = (next + 1) % clis.length
                    setToIdx(next)
                  }}
                >⮞</text>
              </box>
              <box height={1} />
              <Show when={toCLI()!.skills.length > 0} fallback={<text fg={theme.muted}>no skills</text>}>
                <For each={toCLI()!.skills}>
                  {(skill) => (
                    <text fg={theme.fg}>
                      <span fg={theme.success}>● </span>
                      {skill.name}
                    </text>
                  )}
                </For>
              </Show>
            </Show>
          </box>
        </box>
      </Show>

      <Show when={tab() === "agents"}>
        <box flexGrow={1} flexDirection="row">
          {/* FROM agents panel */}
          <box
            flexGrow={1}
            border
            borderStyle="rounded"
            borderColor={panel() === "from" ? theme.accent : theme.border}
            paddingLeft={1}
            paddingRight={1}
            flexDirection="column"
            onMouseDown={() => setPanel("from")}
          >
            <text fg={theme.muted}>{t.from}</text>
            <Show when={fromCLI()}>
              <box flexDirection="row" gap={1}>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (fromIdx() - 1 + clis.length) % clis.length
                    if (next === toIdx()) next = (next - 1 + clis.length) % clis.length
                    setFromIdx(next)
                  }}
                >⮜</text>
                <text fg={theme.fg}>{fromCLI()!.adapter.name}</text>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (fromIdx() + 1) % clis.length
                    if (next === toIdx()) next = (next + 1) % clis.length
                    setFromIdx(next)
                  }}
                >⮞</text>
              </box>
              <box height={1} />
              <Show when={fromCLI()!.agents.length > 0} fallback={<text fg={theme.muted}>no agents</text>}>
                {(() => {
                  const agents = fromCLI()!.agents
                  const maxVisible = visibleRows()
                  const start = Math.max(0, Math.min(cursor() - Math.floor(maxVisible / 2), agents.length - maxVisible))
                  const end = Math.min(agents.length, start + maxVisible)
                  const visible = agents.slice(start, end)
                  return <>
                    <Show when={start > 0}><text fg={theme.muted}>  ↑ {start} more</text></Show>
                    <For each={visible}>
                      {(agent, vi) => {
                        const i = () => start + vi()
                        return (
                          <text
                            fg={cursor() === i() && panel() === "from" ? theme.accent : theme.fg}
                            onMouseDown={() => {
                              setCursor(i())
                              setPanel("from")
                              setSelected((s) => {
                                const next = new Set(s)
                                next.has(agent.name) ? next.delete(agent.name) : next.add(agent.name)
                                return next
                              })
                            }}
                            onMouseOver={() => { setCursor(i()); setPanel("from") }}
                          >
                            {selected().has(agent.name) ? "◉ " : "○ "}
                            <span fg={theme.muted}>{agent._scope === "project" ? "[P] " : "[G] "}</span>
                            {agent.name}
                          </text>
                        )
                      }}
                    </For>
                    <Show when={end < agents.length}><text fg={theme.muted}>  ↓ {agents.length - end} more</text></Show>
                  </>
                })()}
              </Show>
            </Show>
          </box>

          {/* Arrow */}
          <box width={7} alignItems="center" justifyContent="center">
            <box
              border
              borderStyle="rounded"
              borderColor={selected().size > 0 ? theme.accent : theme.border}
              paddingLeft={1}
              paddingRight={1}
              onMouseDown={() => { if (selected().size > 0) handleAgentsTransfer() }}
            >
              <text fg={selected().size > 0 ? theme.accent : theme.muted}>{transferring() ? "..." : "►"}</text>
            </box>
          </box>

          {/* TO agents panel */}
          <box
            flexGrow={1}
            border
            borderStyle="rounded"
            borderColor={panel() === "to" ? theme.accent : theme.border}
            paddingLeft={1}
            paddingRight={1}
            flexDirection="column"
            onMouseDown={() => setPanel("to")}
          >
            <text fg={theme.muted}>{t.to}</text>
            <Show when={toCLI()}>
              <box flexDirection="row" gap={1}>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (toIdx() - 1 + clis.length) % clis.length
                    if (next === fromIdx()) next = (next - 1 + clis.length) % clis.length
                    setToIdx(next)
                  }}
                >⮜</text>
                <text fg={theme.fg}>{toCLI()!.adapter.name}</text>
                <text
                  fg={theme.muted}
                  onMouseDown={() => {
                    const clis = installedCLIs()
                    let next = (toIdx() + 1) % clis.length
                    if (next === fromIdx()) next = (next + 1) % clis.length
                    setToIdx(next)
                  }}
                >⮞</text>
              </box>
              <box height={1} />
              <Show when={toCLI()!.agents.length > 0} fallback={<text fg={theme.muted}>no agents</text>}>
                <For each={toCLI()!.agents}>
                  {(agent) => (
                    <text fg={theme.fg}>
                      <span fg={theme.success}>● </span>
                      {agent.name}
                    </text>
                  )}
                </For>
              </Show>
            </Show>
          </box>
        </box>
      </Show>

      {/* Toast */}
      <Show when={toastMsg()}>
        <box width="100%" height={1} paddingLeft={1}>
          <text fg={toastType() === "success" ? theme.success : theme.error}>{toastMsg()}</text>
        </box>
      </Show>

      <WarningPanel warnings={warnings()} />
      <StatusBar hints={[
        { key: "1", label: "MCP" },
        { key: "2", label: "Rules" },
        { key: "3", label: "Skills" },
        { key: "4", label: "Agents" },
        { key: "⮜⮞", label: t.switchCli },
        { key: "space", label: t.select },
        { key: "⏎", label: t.transfer },
        { key: "tab", label: t.panel },
        ...(state.projectRoot ? [{ key: "s", label: t.scope }] : []),
        { key: "esc", label: t.back },
      ]} />
    </box>
  )
}
