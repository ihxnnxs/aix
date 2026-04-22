import { createMemo, createSignal } from "solid-js"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "../context/theme"
import { useApp } from "../context/app"
import { KEYBINDS, matchKey } from "../context/keybind"
import { CLICard } from "../components/cli-card"
import { StatusBar } from "../components/status-bar"
import { getStrings } from "../i18n"

export function List() {
  const theme = useTheme()
  const [state, actions] = useApp()
  const t = getStrings()
  const dims = useTerminalDimensions()
  const [tab, setTab] = createSignal<"mcp" | "rules" | "skills" | "agents">("mcp")

  const stats = createMemo(() => {
    const installed = state.clis.filter((c) => c.detection.installed).length
    const totalMcp = state.clis.reduce((sum, c) => sum + c.servers.length, 0)
    const totalRules = state.clis.reduce((sum, c) => sum + c.rules.length, 0)
    const totalSkills = state.clis.reduce((sum, c) => sum + c.skills.length, 0)
    const totalAgents = state.clis.reduce((sum, c) => sum + c.agents.length, 0)
    return { installed, totalMcp, totalRules, totalSkills, totalAgents }
  })

  const cardWidth = createMemo(() => Math.floor((dims().width - 4) / 2) - 1)

  useKeyboard((key: any) => {
    if (key.name === "1") setTab("mcp")
    if (key.name === "2") setTab("rules")
    if (key.name === "3") setTab("skills")
    if (key.name === "4") setTab("agents")
    if (matchKey(key, KEYBINDS.back)) actions.navigate("home")
    if (key.name === "t") actions.navigate("transfer")
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
          <text fg={theme.muted}>⮜ {t.back}</text>
        </box>
        <box flexDirection="row" gap={1}>
          <text fg={theme.accent}>≡</text>
          <text fg={theme.fg}>{t.list}</text>
        </box>
        <box flexGrow={1} />
        <box flexDirection="row" gap={0}>
          <box
            paddingLeft={2}
            paddingRight={2}
            backgroundColor={tab() === "mcp" ? theme.accent : theme.border}
            onMouseDown={() => setTab("mcp")}
          >
            <text fg={tab() === "mcp" ? theme.bg : theme.muted}>MCP</text>
          </box>
          <box
            paddingLeft={2}
            paddingRight={2}
            backgroundColor={tab() === "rules" ? theme.accent : theme.border}
            onMouseDown={() => setTab("rules")}
          >
            <text fg={tab() === "rules" ? theme.bg : theme.muted}>Rules</text>
          </box>
          <box
            paddingLeft={2}
            paddingRight={2}
            backgroundColor={tab() === "skills" ? theme.accent : theme.border}
            onMouseDown={() => setTab("skills")}
          >
            <text fg={tab() === "skills" ? theme.bg : theme.muted}>Skills</text>
          </box>
          <box
            paddingLeft={2}
            paddingRight={2}
            backgroundColor={tab() === "agents" ? theme.accent : theme.border}
            onMouseDown={() => setTab("agents")}
          >
            <text fg={tab() === "agents" ? theme.bg : theme.muted}>Agents</text>
          </box>
        </box>
        <box flexGrow={1} />
        <text fg={theme.muted}>
          {stats().installed} CLI · {tab() === "mcp" ? `${stats().totalMcp} MCP` : tab() === "rules" ? `${stats().totalRules} rules` : tab() === "skills" ? `${stats().totalSkills} skills` : `${stats().totalAgents} agents`}
        </text>
      </box>

      {/* Cards */}
      <box flexGrow={1} flexDirection="row" flexWrap="wrap" gap={1} padding={1}>
        {state.clis.filter((cli) => cli.detection.installed).map((cli) => <CLICard cli={cli} width={cardWidth()} mode={tab()} />)}
      </box>

      <StatusBar hints={[
        { key: "1", label: "MCP" },
        { key: "2", label: "Rules" },
        { key: "3", label: "Skills" },
        { key: "4", label: "Agents" },
        { key: "t", label: t.transfer },
        { key: "esc", label: t.back },
        { key: "q", label: t.quit },
      ]} />
    </box>
  )
}
