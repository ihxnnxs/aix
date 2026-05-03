import { createSignal, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useTheme, getAllThemes, switchTheme } from "../context/theme"
import { useApp } from "../context/app"
import { KEYBINDS, matchKey } from "../context/keybind"
import { StatusBar } from "../components/status-bar"
import { KVStore } from "../../config/store"
import { getStrings, getAllLanguages } from "../i18n"

type SettingsView = "menu" | "language" | "theme" | "skipBootAnimation"

export function Settings() {
  const theme = useTheme()
  const [, actions] = useApp()
  const themes = getAllThemes()
  const languages = getAllLanguages()
  const store = new KVStore()
  const t = getStrings()

  const [view, setView] = createSignal<SettingsView>("menu")
  const [menuCursor, setMenuCursor] = createSignal(0)
  const [themeCursor, setThemeCursor] = createSignal(
    Math.max(0, themes.findIndex((th) => th.id === (store.get<string>("theme") ?? "default")))
  )
  const [langCursor, setLangCursor] = createSignal(
    Math.max(0, languages.findIndex((l) => l.id === (store.get<string>("language") ?? "en")))
  )
  const [skipBootCursor, setSkipBootCursor] = createSignal(
    store.get<boolean>("skipBootAnimation") ?? false ? 1 : 0
  )

  const MENU_ITEMS = [
    { id: "language" as const, label: t.language, icon: "🌐" },
    { id: "theme" as const, label: t.theme, icon: "◆" },
    { id: "skipBootAnimation" as const, label: t.skipBootAnimation, icon: "▶" },
    { id: "back" as const, label: t.back, icon: "⮜" },
  ]

  useKeyboard((key: any) => {
    const v = view()

    if (matchKey(key, KEYBINDS.back)) {
      if (v === "menu") actions.navigate("home")
      else setView("menu")
      return
    }

    if (v === "menu") {
      if (matchKey(key, KEYBINDS.up)) setMenuCursor((c) => Math.max(0, c - 1))
      if (matchKey(key, KEYBINDS.down)) setMenuCursor((c) => Math.min(MENU_ITEMS.length - 1, c + 1))
      if (matchKey(key, KEYBINDS.select)) {
        const item = MENU_ITEMS[menuCursor()]
        if (item.id === "back") actions.navigate("home")
        else setView(item.id)
      }
    }

    if (v === "theme") {
      if (matchKey(key, KEYBINDS.up)) setThemeCursor((c) => Math.max(0, c - 1))
      if (matchKey(key, KEYBINDS.down)) setThemeCursor((c) => Math.min(themes.length - 1, c + 1))
      if (matchKey(key, KEYBINDS.select) || matchKey(key, KEYBINDS.toggle)) {
        switchTheme(themes[themeCursor()].id)
        setView("menu")
      }
    }

    if (v === "language") {
      if (matchKey(key, KEYBINDS.up)) setLangCursor((c) => Math.max(0, c - 1))
      if (matchKey(key, KEYBINDS.down)) setLangCursor((c) => Math.min(languages.length - 1, c + 1))
      if (matchKey(key, KEYBINDS.select) || matchKey(key, KEYBINDS.toggle)) {
        store.set("language", languages[langCursor()].id)
        actions.navigate("home")
      }
    }

    if (v === "skipBootAnimation") {
      if (matchKey(key, KEYBINDS.up) || matchKey(key, KEYBINDS.down)) {
        setSkipBootCursor((c) => (c === 0 ? 1 : 0))
      }
      if (matchKey(key, KEYBINDS.select) || matchKey(key, KEYBINDS.toggle)) {
        store.set("skipBootAnimation", skipBootCursor() === 1)
        setView("menu")
      }
    }
  })

  return (
    <box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <box width="100%" height={1} flexDirection="row" gap={1} paddingLeft={1}>
        <text fg={theme.accent}>⚙</text>
        <text fg={theme.fg}>{t.settings}</text>
      </box>

      {/* Content */}
      <box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="column">

        {/* Menu view */}
        <Show when={view() === "menu"}>
          <box flexDirection="column" alignItems="center">
            {MENU_ITEMS.map((item, i) => {
              const isSelected = () => menuCursor() === i
              return (
                <box
                  width={30}
                  height={3}
                  border
                  borderStyle="rounded"
                  borderColor={isSelected() ? theme.accent : theme.border}
                  justifyContent="center"
                  alignItems="center"
                  flexDirection="row"
                  gap={1}
                  onMouseDown={() => { setMenuCursor(i); item.id === "back" ? actions.navigate("home") : setView(item.id) }}
                  onMouseOver={() => setMenuCursor(i)}
                >
                  <text fg={isSelected() ? theme.accent : theme.muted}>{item.icon}</text>
                  <text fg={isSelected() ? theme.fg : theme.muted}>{item.label}</text>
                </box>
              )
            })}

          </box>
        </Show>

        {/* Theme view */}
        <Show when={view() === "theme"}>
          <box
            border
            borderStyle="rounded"
            borderColor={theme.accent}
            flexDirection="column"
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            paddingBottom={1}
            width={36}
          >
            <text fg={theme.accent}>{t.theme}</text>
            <box height={1} />
            {themes.map((th, i) => {
              const savedThemeId = store.get<string>("theme") ?? "default"
              const isActive = savedThemeId === th.id
              return (
                <box
                  height={1}
                  width={30}
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={themeCursor() === i ? theme.border : undefined}
                  onMouseDown={() => { switchTheme(th.id); setView("menu") }}
                  onMouseOver={() => setThemeCursor(i)}
                  flexDirection="row"
                  gap={1}
                >
                  <text fg={isActive ? theme.accent : themeCursor() === i ? theme.fg : theme.muted}>
                    {isActive ? "●" : "○"}
                  </text>
                  <text fg={isActive ? theme.accent : themeCursor() === i ? theme.fg : theme.muted}>
                    {th.name}
                  </text>
                  <text fg={th.accent}>■</text>
                </box>
              )
            })}
          </box>
        </Show>

        {/* Skip boot animation view */}
        <Show when={view() === "skipBootAnimation"}>
          <box
            border
            borderStyle="rounded"
            borderColor={theme.accent}
            flexDirection="column"
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            paddingBottom={1}
            width={36}
          >
            <text fg={theme.accent}>{t.skipBootAnimation}</text>
            <box height={1} />
            {[
              { label: "Off", value: false },
              { label: "On", value: true },
            ].map((opt, i) => {
              const saved = store.get<boolean>("skipBootAnimation") ?? false
              const isActive = saved === opt.value
              return (
                <box
                  height={1}
                  width={30}
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={skipBootCursor() === i ? theme.border : undefined}
                  onMouseDown={() => { store.set("skipBootAnimation", opt.value); setView("menu") }}
                  onMouseOver={() => setSkipBootCursor(i)}
                  flexDirection="row"
                  gap={1}
                >
                  <text fg={isActive ? theme.accent : skipBootCursor() === i ? theme.fg : theme.muted}>
                    {isActive ? "●" : "○"}
                  </text>
                  <text fg={isActive ? theme.accent : skipBootCursor() === i ? theme.fg : theme.muted}>
                    {opt.label}
                  </text>
                </box>
              )
            })}
          </box>
        </Show>

        {/* Language view */}
        <Show when={view() === "language"}>
          <box
            border
            borderStyle="rounded"
            borderColor={theme.accent}
            flexDirection="column"
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            paddingBottom={1}
            width={36}
          >
            <text fg={theme.accent}>{t.language}</text>
            <box height={1} />
            {languages.map((l, i) => {
              const savedLang = store.get<string>("language") ?? "en"
              const isActive = savedLang === l.id
              return (
                <box
                  height={1}
                  width={30}
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={langCursor() === i ? theme.border : undefined}
                  onMouseDown={() => { store.set("language", l.id); setView("menu") }}
                  onMouseOver={() => setLangCursor(i)}
                  flexDirection="row"
                  gap={1}
                >
                  <text fg={isActive ? theme.accent : langCursor() === i ? theme.fg : theme.muted}>
                    {isActive ? "●" : "○"}
                  </text>
                  <text fg={isActive ? theme.accent : langCursor() === i ? theme.fg : theme.muted}>
                    {l.name}
                  </text>
                </box>
              )
            })}
          </box>
        </Show>
      </box>

      <StatusBar hints={
        view() === "menu"
          ? [{ key: "↑↓", label: t.navigate }, { key: "⏎", label: t.open }, { key: "q", label: t.quit }]
          : [{ key: "↑↓", label: t.navigate }, { key: "⏎", label: t.apply }, { key: "esc", label: t.back }]
      } />
    </box>
  )
}
