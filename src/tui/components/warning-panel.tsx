import { For, Show } from "solid-js"
import { useTheme } from "../context/theme"

interface Warning { serverName: string; message: string }

export function WarningPanel(props: { warnings: Warning[] }) {
  const theme = useTheme()
  return (
    <Show when={props.warnings.length > 0}>
      <box width="100%" borderStyle="single" borderColor={theme.warning} paddingLeft={1} paddingRight={1}>
        <For each={props.warnings}>
          {(w) => <text fg={theme.warning}>⚠ {w.serverName}: {w.message}</text>}
        </For>
      </box>
    </Show>
  )
}
