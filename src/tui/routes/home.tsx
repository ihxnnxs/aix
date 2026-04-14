import { createSignal, Show, onMount } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useTheme } from "../context/theme"
import { useApp } from "../context/app"
import { KEYBINDS, matchKey } from "../context/keybind"
import { StatusBar } from "../components/status-bar"
import { VERSION } from "../../version"
import { checkForUpdate, type UpdateInfo } from "../../utils/update"

const ASCII_LOGO = [
  "░█▀█░▀█▀░█░█░",
  "░█▀█░░█░░▄▀▄░",
  "░▀░▀░▀▀▀░▀░▀░",
]

const MENU_ITEMS = [
  { id: "transfer" as const, label: "Transfer", icon: "⇄" },
  { id: "list" as const, label: "List", icon: "≡" },
]

const SOCIAL_LINKS = [
  { label: "GitHub", url: "https://github.com/ihxnnxs" },
  { label: "𝕏", url: "https://x.com/ihxnnxs" },
]

export function Home() {
  const theme = useTheme()
  const [, actions] = useApp()
  const [selected, setSelected] = createSignal(0)
  const [showTooltip, setShowTooltip] = createSignal(false)
  const [updateInfo, setUpdateInfo] = createSignal<UpdateInfo | null>(null)

  onMount(async () => {
    const info = await checkForUpdate()
    setUpdateInfo(info)
  })

  useKeyboard((key: any) => {
    if (matchKey(key, KEYBINDS.up)) setSelected((s) => Math.max(0, s - 1))
    if (matchKey(key, KEYBINDS.down)) setSelected((s) => Math.min(MENU_ITEMS.length - 1, s + 1))
    if (matchKey(key, KEYBINDS.select)) actions.navigate(MENU_ITEMS[selected()].id)
    if (matchKey(key, KEYBINDS.back)) setShowTooltip(false)
  })

  return (
    <box flexDirection="column" width="100%" height="100%">
      <box width="100%" height={1} flexDirection="row" justifyContent="flex-end" paddingRight={1}>
        <text fg={theme.border}>v{VERSION}</text>
      </box>
      <Show when={updateInfo()}>
        <box width="100%" height={1} justifyContent="center">
          <text fg={theme.accent}>
            Update available: v{updateInfo()!.current} → v{updateInfo()!.latest}  run: curl -fsSL https://raw.githubusercontent.com/ihxnnxs/aix/main/install.sh | bash
          </text>
        </box>
      </Show>
      <box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="column">
        {/* ASCII Logo */}
        {ASCII_LOGO.map((line) => (
          <text fg={theme.accent}>{line}</text>
        ))}

        <box height={1} />
        <text fg={theme.muted}>All your AI tools, one place</text>
        <box height={1} />

        {/* Menu buttons */}
        {MENU_ITEMS.map((item, i) => {
          const isSelected = () => selected() === i
          return (
            <box flexDirection="column" alignItems="center">
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
                onMouseDown={() => {
                  setSelected(i)
                  actions.navigate(item.id)
                }}
                onMouseOver={() => setSelected(i)}
              >
                <text fg={isSelected() ? theme.accent : theme.muted}>{item.icon}</text>
                <text fg={isSelected() ? theme.fg : theme.muted}>{item.label}</text>
              </box>
            </box>
          )
        })}

        {/* Marketplace - disabled */}
        <box flexDirection="column" alignItems="center">
          <box
            width={30}
            height={3}
            border
            borderStyle="rounded"
            borderColor={theme.border}
            justifyContent="center"
            alignItems="center"
            flexDirection="row"
            gap={1}
          >
            <text fg={theme.border}>⛒</text>
            <text fg={theme.border}>Marketplace</text>
            <text fg={theme.border}>Soon...</text>
          </box>
        </box>
      </box>

      {/* Tooltip */}
      <Show when={showTooltip()}>
        <box width="100%" justifyContent="center" flexDirection="row" gap={1} height={1}>
          {SOCIAL_LINKS.map((link) => (
            <text
              fg={theme.muted}
              onMouseDown={() => {
                Bun.spawn(["xdg-open", link.url], { stderr: "ignore", stdout: "ignore" })
              }}
              onMouseOver={() => {}}
            >
              {` ${link.label} `}
            </text>
          ))}
        </box>
      </Show>

      {/* Footer with author */}
      <box width="100%" height={1} justifyContent="center" alignItems="center">
        <text
          fg={theme.muted}
          onMouseDown={() => setShowTooltip((v) => !v)}
          onMouseOver={() => {}}
        >
          @ihxnnxs
        </text>
      </box>
    </box>
  )
}
