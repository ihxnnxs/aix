import { createSignal, createMemo, For, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useTheme } from "../context/theme"
import { useApp, type CLIState } from "../context/app"
import { KEYBINDS, matchKey } from "../context/keybind"
import { StatusBar } from "../components/status-bar"
import { WarningPanel } from "../components/warning-panel"
import { BackupManager } from "../../config/backup"

export function Transfer() {
  const theme = useTheme()
  const [state, actions] = useApp()

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

  useKeyboard((key: any) => {
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
      const servers = fromCLI()!.servers
      if (matchKey(key, KEYBINDS.up)) setCursor((c) => Math.max(0, c - 1))
      if (matchKey(key, KEYBINDS.down)) setCursor((c) => Math.min(servers.length - 1, c + 1))
      if (matchKey(key, KEYBINDS.toggle) && servers[cursor()]) {
        const server = servers[cursor()]
        setSelected((s) => {
          const next = new Set(s)
          if (next.has(server.name)) {
            next.delete(server.name)
          } else {
            next.add(server.name)
            setTargetScope(server._scope)
          }
          return next
        })
      }
    }

    if (key.name === "s" && state.projectRoot) {
      setTargetScope((s) => s === "global" ? "project" : "global")
    }

    if (matchKey(key, KEYBINDS.select) && selected().size > 0) handleTransfer()
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
          <text fg={theme.muted}>⮜ Back</text>
        </box>
        <box flexDirection="row" gap={1}>
          <text fg={theme.accent}>⇄</text>
          <text fg={theme.fg}>Transfer</text>
        </box>
        <box flexGrow={1} />
        <Show when={selected().size > 0}>
          <text fg={theme.accent}>{selected().size} selected</text>
        </Show>
      </box>

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
          <text fg={theme.muted}>FROM</text>
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
              <text fg={theme.fg}>{fromCLI()!.adapter.icon} {fromCLI()!.adapter.name}</text>
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
          <text fg={theme.muted}>TO</text>
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
              <text fg={theme.fg}>{toCLI()!.adapter.icon} {toCLI()!.adapter.name}</text>
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

      {/* Toast */}
      <Show when={toastMsg()}>
        <box width="100%" height={1} paddingLeft={1}>
          <text fg={toastType() === "success" ? theme.success : theme.error}>{toastMsg()}</text>
        </box>
      </Show>

      <WarningPanel warnings={warnings()} />
      <StatusBar hints={[
        { key: "⮜⮞", label: "switch CLI" },
        { key: "space", label: "select" },
        { key: "⏎", label: "transfer" },
        { key: "tab", label: "panel" },
        ...(state.projectRoot ? [{ key: "s", label: "scope" }] : []),
        { key: "esc", label: "back" },
      ]} />
    </box>
  )
}
