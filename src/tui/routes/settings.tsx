import { createSignal, For } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useTheme, getAllThemes, switchTheme } from "../context/theme"
import { useApp } from "../context/app"
import { KEYBINDS, matchKey } from "../context/keybind"
import { StatusBar } from "../components/status-bar"

export function Settings() {
  const theme = useTheme()
  const [, actions] = useApp()
  const themes = getAllThemes()
  const [cursor, setCursor] = createSignal(
    themes.findIndex((t) => t.id === theme.id) ?? 0
  )

  useKeyboard((key: any) => {
    if (matchKey(key, KEYBINDS.back)) actions.navigate("home")
    if (matchKey(key, KEYBINDS.up)) setCursor((c) => Math.max(0, c - 1))
    if (matchKey(key, KEYBINDS.down)) setCursor((c) => Math.min(themes.length - 1, c + 1))
    if (matchKey(key, KEYBINDS.select) || matchKey(key, KEYBINDS.toggle)) {
      switchTheme(themes[cursor()].id)
    }
  })

  return (
    <box flexDirection="column" width="100%" height="100%">
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
          <text fg={theme.accent}>⚙</text>
          <text fg={theme.fg}>Settings</text>
        </box>
      </box>

      <box flexGrow={1} flexDirection="column" padding={1}>
        <box
          border
          borderStyle="rounded"
          borderColor={theme.border}
          flexDirection="column"
          paddingLeft={1}
          paddingRight={1}
          width={40}
        >
          <text fg={theme.fg}>Theme</text>
          <box height={1} />
          <For each={themes}>
            {(t, i) => {
              const isActive = () => theme.id === t.id
              const isCursor = () => cursor() === i()
              return (
                <text
                  fg={isCursor() ? theme.accent : isActive() ? theme.fg : theme.muted}
                  onMouseDown={() => { setCursor(i()); switchTheme(t.id) }}
                  onMouseOver={() => setCursor(i())}
                >
                  {isActive() ? "● " : "○ "}{t.name}
                </text>
              )
            }}
          </For>
        </box>
      </box>

      <StatusBar hints={[
        { key: "↑↓", label: "navigate" },
        { key: "⏎", label: "select" },
        { key: "esc", label: "back" },
        { key: "q", label: "quit" },
      ]} />
    </box>
  )
}
