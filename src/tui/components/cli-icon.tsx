import { useTheme } from "../context/theme"

/** Clawd mascot from Claude Code source — rgb(215,119,87) */
const CLAWD = {
  lines: [" ▐▛███▜▌ ", "▝▜█████▛▘", "  ▘▘ ▝▝  "],
  fg: "#d77757",
}

interface IconDef {
  type: "clawd" | "text"
  label?: string
  fg: string
}

const ICONS: Record<string, IconDef> = {
  "claude-code": { type: "clawd", fg: CLAWD.fg },
  "claude-desktop": { type: "clawd", fg: "#f5a742" },
  cursor: { type: "text", label: "Cu", fg: "#7fd88f" },
  vscode: { type: "text", label: "VS", fg: "#5c9cf5" },
}

export function CLIIcon(props: { adapterId: string }) {
  const theme = useTheme()
  const icon = () => ICONS[props.adapterId] ?? { type: "text", label: "??", fg: theme.muted }

  return (
    <box>
      {icon().type === "clawd" ? (
        <box flexDirection="column">
          {CLAWD.lines.map((line) => (
            <text fg={icon().fg}>{line}</text>
          ))}
        </box>
      ) : (
        <text fg={icon().fg}>{icon().label}</text>
      )}
    </box>
  )
}
