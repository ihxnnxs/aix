import { For } from "solid-js"
import { useTheme } from "../context/theme"

interface StatusBarProps {
  hints: Array<{ key: string; label: string }>
}

export function StatusBar(props: StatusBarProps) {
  const theme = useTheme()
  return (
    <box width="100%" height={1} flexDirection="row" gap={2} backgroundColor={theme.border} paddingLeft={1}>
      <For each={props.hints}>
        {(hint) => (
          <text>
            <span fg={theme.accent}>{hint.key}</span>
            <span fg={theme.muted}> {hint.label}</span>
          </text>
        )}
      </For>
    </box>
  )
}
