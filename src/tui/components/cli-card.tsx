import { For, Show, createMemo } from "solid-js"
import { useTheme } from "../context/theme"
import { MCPItem } from "./mcp-item"
import { useApp } from "../context/app"
import type { CLIState } from "../context/app"

export function CLICard(props: { cli: CLIState; width?: number }) {
  const theme = useTheme()
  const [state] = useApp()

  const globalServers = createMemo(() => props.cli.servers.filter((s) => s._scope === "global"))
  const projectServers = createMemo(() => props.cli.servers.filter((s) => s._scope === "project"))
  const showGroups = () => !!state.projectRoot && (globalServers().length > 0 || projectServers().length > 0)

  const borderColor = () => {
    if (!props.cli.detection.installed) return theme.border
    if (props.cli.servers.length === 0) return theme.border
    return theme.accent
  }

  return (
    <box
      width={props.width ?? 25}
      border
      borderStyle="rounded"
      borderColor={borderColor()}
      paddingLeft={1}
      paddingRight={1}
      flexDirection="column"
    >
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.fg}>{props.cli.adapter.name}</text>
        <Show when={props.cli.detection.installed && props.cli.servers.length > 0}>
          <text fg={theme.muted}>{props.cli.servers.length}</text>
        </Show>
      </box>
      <Show when={!props.cli.detection.installed}>
        <text fg={theme.muted}>not found</text>
      </Show>
      <Show when={props.cli.detection.installed && props.cli.servers.length === 0}>
        <text fg={theme.muted}>no servers</text>
      </Show>
      <Show when={props.cli.detection.installed && props.cli.servers.length > 0}>
        <box height={1} />
        <Show when={showGroups()} fallback={
          <For each={props.cli.servers}>{(server) => <MCPItem server={server} />}</For>
        }>
          <Show when={globalServers().length > 0}>
            <text fg={theme.muted}>Global ({globalServers().length})</text>
            <For each={globalServers()}>{(server) => <MCPItem server={server} />}</For>
          </Show>
          <Show when={projectServers().length > 0}>
            <text fg={theme.muted}>Project ({projectServers().length})</text>
            <For each={projectServers()}>{(server) => <MCPItem server={server} />}</For>
          </Show>
        </Show>
      </Show>
    </box>
  )
}
