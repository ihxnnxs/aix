import { createSignal, createMemo, For, Show, onMount } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useTheme } from "../context/theme"
import { useApp } from "../context/app"
import { KEYBINDS, matchKey } from "../context/keybind"
import { StatusBar } from "../components/status-bar"
import { BackupManager, type BackupEntry } from "../../config/backup"

export function Backups() {
  const theme = useTheme()
  const [, actions] = useApp()
  const mgr = new BackupManager()

  const [entries, setEntries] = createSignal<BackupEntry[]>([])
  const [cursor, setCursor] = createSignal(0)
  const [toastMsg, setToastMsg] = createSignal("")
  const [toastType, setToastType] = createSignal<"success" | "error">("success")
  const [confirm, setConfirm] = createSignal<"restore" | "delete" | null>(null)

  const refresh = async () => {
    const list = await mgr.list()
    setEntries(list)
    if (cursor() >= list.length) setCursor(Math.max(0, list.length - 1))
  }
  onMount(refresh)

  const selected = createMemo(() => entries()[cursor()])

  useKeyboard(async (key: any) => {
    if (matchKey(key, KEYBINDS.back)) { actions.navigate("home"); return }
    if (confirm()) {
      if (key.name === "y") {
        try {
          const item = selected()
          if (!item) { setConfirm(null); return }
          if (confirm() === "restore") {
            await mgr.restore(item.id)
            setToastMsg(`Restored ${item.originalPath}`)
            setToastType("success")
          } else {
            const { rmSync } = await import("node:fs")
            const { join } = await import("node:path")
            rmSync(join(process.env.HOME ?? "~", ".config", "aix", "backups", item.id), { recursive: true, force: true })
            setToastMsg("Deleted")
            setToastType("success")
          }
          await refresh()
        } catch (e) {
          setToastMsg(e instanceof Error ? e.message : "error")
          setToastType("error")
        }
        setConfirm(null)
        return
      }
      if (key.name === "n" || key.name === "escape") { setConfirm(null); return }
      return
    }
    if (matchKey(key, KEYBINDS.up)) setCursor((c) => Math.max(0, c - 1))
    if (matchKey(key, KEYBINDS.down)) setCursor((c) => Math.min(entries().length - 1, c + 1))
    if (key.name === "r" && selected()) setConfirm("restore")
    if (key.name === "d" && selected()) setConfirm("delete")
    if (key.name === "p") {
      const removed = await mgr.prune(30)
      setToastMsg(`Pruned ${removed} backup${removed === 1 ? "" : "s"} older than 30 days`)
      setToastType("success")
      await refresh()
    }
  })

  return (
    <box flexDirection="column" width="100%" height="100%">
      <box width="100%" height={3} flexDirection="row" alignItems="center" paddingLeft={1}>
        <box border borderStyle="rounded" borderColor={theme.border} paddingLeft={1} paddingRight={1} onMouseDown={() => actions.navigate("home")}>
          <text fg={theme.muted}>⮜ Backups</text>
        </box>
      </box>

      <box flexGrow={1} flexDirection="column" paddingLeft={1} paddingRight={1}>
        <Show when={entries().length > 0} fallback={<text fg={theme.muted}>No backups</text>}>
          <For each={entries()}>
            {(e, i) => (
              <text fg={cursor() === i() ? theme.accent : theme.fg} onMouseDown={() => setCursor(i())}>
                {cursor() === i() ? "▸ " : "  "}{e.id} · {e.adapterId} · {e.originalPath}
              </text>
            )}
          </For>
        </Show>

        <Show when={selected()}>
          <box height={1} />
          <text fg={theme.muted}>Details: {selected()!.adapterId}</text>
          <text fg={theme.muted}>  Original: {selected()!.originalPath}</text>
          <text fg={theme.muted}>  Created: {selected()!.createdAt.toISOString()}</text>
        </Show>

        <Show when={confirm()}>
          <box height={1} />
          <text fg={theme.warning ?? theme.accent}>
            {confirm() === "restore" ? `Restore to ${selected()?.originalPath}?` : "Delete this backup?"} [y/n]
          </text>
        </Show>
      </box>

      <Show when={toastMsg()}>
        <box width="100%" height={1} paddingLeft={1}>
          <text fg={toastType() === "success" ? theme.success : theme.error}>{toastMsg()}</text>
        </box>
      </Show>

      <StatusBar hints={[
        { key: "r", label: "restore" },
        { key: "d", label: "delete" },
        { key: "p", label: "prune >30d" },
        { key: "↑↓", label: "nav" },
        { key: "esc", label: "back" },
      ]} />
    </box>
  )
}
