import { createSignal, Show, onMount } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useTheme } from "../context/theme"
import { useApp } from "../context/app"
import { KEYBINDS, matchKey } from "../context/keybind"
import { StatusBar } from "../components/status-bar"
import { VERSION } from "../../version"
import { checkForUpdate, type UpdateInfo, performUpdate } from "../../utils/update"
import { getStrings } from "../i18n"

const ASCII_LOGO = [
  "░█▀█░▀█▀░█░█░",
  "░█▀█░░█░░▄▀▄░",
  "░▀░▀░▀▀▀░▀░▀░",
]

const SOCIAL_LINKS = [
  { label: "GitHub", url: "https://github.com/ihxnnxs" },
  { label: "𝕏", url: "https://x.com/ihxnnxs" },
]

export function Home() {
  const theme = useTheme()
  const [, actions] = useApp()
  const t = getStrings()
  const MENU_ITEMS = [
    { id: "transfer" as const, label: t.transfer, icon: "⇄" },
    { id: "list" as const, label: t.list, icon: "≡" },
    { id: "settings" as const, label: t.settings, icon: "⚙" },
  ]
  const [selected, setSelected] = createSignal(0)
  const [showTooltip, setShowTooltip] = createSignal(false)
  const [updateInfo, setUpdateInfo] = createSignal<UpdateInfo | null>(null)
  const [showUpdate, setShowUpdate] = createSignal(false)
  const [updateBtn, setUpdateBtn] = createSignal(0) // 0 = Update, 1 = Later
  const [updateStatus, setUpdateStatus] = createSignal("")

  onMount(async () => {
    const info = await checkForUpdate()
    if (info) {
      setUpdateInfo(info)
      setShowUpdate(true)
    }
  })

  useKeyboard((key: any) => {
    if (showUpdate()) {
      if (matchKey(key, KEYBINDS.left) || matchKey(key, KEYBINDS.right)) {
        setUpdateBtn((b) => b === 0 ? 1 : 0)
      }
      if (matchKey(key, KEYBINDS.select)) {
        if (updateBtn() === 0) {
          setUpdateStatus(t.updating ?? "Updating...")
          performUpdate(updateInfo()!.latest).then((ok) => {
            if (ok) {
              setUpdateStatus(t.updateDone ?? "Updated! Restart aix.")
              setTimeout(() => process.exit(0), 1500)
            } else {
              setUpdateStatus(t.updateFailed ?? "Update failed")
              setTimeout(() => setUpdateStatus(""), 3000)
            }
          })
        } else {
          setShowUpdate(false)
        }
      }
      if (matchKey(key, KEYBINDS.back)) {
        setShowUpdate(false)
      }
      return
    }
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
      <box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="column">
        {/* ASCII Logo */}
        {ASCII_LOGO.map((line) => (
          <text fg={theme.accent}>{line}</text>
        ))}

        <box height={1} />
        <text fg={theme.muted}>{t.allYourAiTools}</text>
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
            <text fg={theme.border}>{t.marketplace}</text>
            <text fg={theme.border}>{t.soon}</text>
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

      {/* Update modal */}
      <Show when={showUpdate() && updateInfo()}>
        <box
          position="absolute"
          width="100%"
          height="100%"
          alignItems="center"
          justifyContent="center"
        >
          <box
            width={44}
            border
            borderStyle="rounded"
            borderColor={theme.accent}
            flexDirection="column"
            alignItems="center"
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            paddingBottom={1}
            backgroundColor={theme.bg}
          >
            <text fg={theme.accent}>{t.updateAvailable}</text>
            <box height={1} />
            <text fg={theme.fg}>v{updateInfo()!.current} → v{updateInfo()!.latest}</text>
            <box height={1} />
            <Show when={updateStatus()}>
              <text fg={theme.accent}>{updateStatus()}</text>
              <box height={1} />
            </Show>
            <box flexDirection="row" gap={2}>
              <box
                border
                borderStyle="rounded"
                borderColor={updateBtn() === 0 ? theme.accent : theme.border}
                paddingLeft={2}
                paddingRight={2}
                onMouseDown={() => {
                  setUpdateStatus(t.updating ?? "Updating...")
                  performUpdate(updateInfo()!.latest).then((ok) => {
                    if (ok) {
                      setUpdateStatus(t.updateDone ?? "Updated! Restart aix.")
                      setTimeout(() => process.exit(0), 1500)
                    } else {
                      setUpdateStatus(t.updateFailed ?? "Update failed")
                      setTimeout(() => setUpdateStatus(""), 3000)
                    }
                  })
                }}
                onMouseOver={() => setUpdateBtn(0)}
              >
                <text fg={updateBtn() === 0 ? theme.accent : theme.muted}>{t.update}</text>
              </box>
              <box
                border
                borderStyle="rounded"
                borderColor={updateBtn() === 1 ? theme.accent : theme.border}
                paddingLeft={2}
                paddingRight={2}
                onMouseDown={() => setShowUpdate(false)}
                onMouseOver={() => setUpdateBtn(1)}
              >
                <text fg={updateBtn() === 1 ? theme.accent : theme.muted}>{t.later}</text>
              </box>
            </box>
          </box>
        </box>
      </Show>
    </box>
  )
}
