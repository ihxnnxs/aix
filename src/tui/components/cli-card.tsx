import { For, Show, createMemo } from "solid-js"
import { useTheme } from "../context/theme"
import { MCPItem } from "./mcp-item"
import { useApp } from "../context/app"
import type { CLIState } from "../context/app"
import { getStrings } from "../i18n"

export function CLICard(props: { cli: CLIState; width?: number; mode?: "mcp" | "rules" | "skills" }) {
  const theme = useTheme()
  const [state] = useApp()
  const t = getStrings()

  const globalServers = createMemo(() => props.cli.servers.filter((s) => s._scope === "global"))
  const projectServers = createMemo(() => props.cli.servers.filter((s) => s._scope === "project"))
  const showGroups = () => !!state.projectRoot && (globalServers().length > 0 || projectServers().length > 0)

  const borderColor = () => {
    if (!props.cli.detection.installed) return theme.border
    if (props.mode === "rules") return props.cli.rules.length > 0 ? theme.accent : theme.border
    if (props.mode === "skills") return props.cli.skills.length > 0 ? theme.accent : theme.border
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
        <text fg={theme.muted}>{t.notFound}</text>
      </Show>
      <Show when={props.mode !== "rules" && props.mode !== "skills"}>
        <Show when={props.cli.detection.installed && props.cli.servers.length === 0}>
          <text fg={theme.muted}>{t.noServers}</text>
        </Show>
        <Show when={props.cli.detection.installed && props.cli.servers.length > 0}>
          <box height={1} />
          <Show when={showGroups()} fallback={
            <For each={props.cli.servers}>{(server) => <MCPItem server={server} />}</For>
          }>
            <Show when={globalServers().length > 0}>
              <text fg={theme.muted}>{t.global} ({globalServers().length})</text>
              <For each={globalServers()}>{(server) => <MCPItem server={server} />}</For>
            </Show>
            <Show when={projectServers().length > 0}>
              <text fg={theme.muted}>{t.project} ({projectServers().length})</text>
              <For each={projectServers()}>{(server) => <MCPItem server={server} />}</For>
            </Show>
          </Show>
        </Show>
      </Show>
      <Show when={props.mode === "rules"}>
        <Show when={props.cli.rules.length === 0}>
          <text fg={theme.muted}>no rules</text>
        </Show>
        <Show when={props.cli.rules.length > 0}>
          <box height={1} />
          <Show when={!!state.projectRoot && (props.cli.rules.some((r) => r._scope === "global") || props.cli.rules.some((r) => r._scope === "project"))} fallback={
            props.cli.rules.map((rule) => (
              <text fg={theme.fg}>
                <span fg={theme.success}>● </span>
                {rule.name}
                <span fg={theme.muted}> ({rule.lines} lines)</span>
              </text>
            ))
          }>
            <Show when={props.cli.rules.some((r) => r._scope === "global")}>
              <text fg={theme.muted}>{t.global} ({props.cli.rules.filter((r) => r._scope === "global").length})</text>
              {props.cli.rules.filter((r) => r._scope === "global").map((rule) => (
                <text fg={theme.fg}>
                  <span fg={theme.success}>● </span>
                  {rule.name}
                  <span fg={theme.muted}> ({rule.lines} lines)</span>
                </text>
              ))}
            </Show>
            <Show when={props.cli.rules.some((r) => r._scope === "project")}>
              <text fg={theme.muted}>{t.project} ({props.cli.rules.filter((r) => r._scope === "project").length})</text>
              {props.cli.rules.filter((r) => r._scope === "project").map((rule) => (
                <text fg={theme.fg}>
                  <span fg={theme.success}>● </span>
                  {rule.name}
                  <span fg={theme.muted}> ({rule.lines} lines)</span>
                </text>
              ))}
            </Show>
          </Show>
        </Show>
      </Show>
      <Show when={props.mode === "skills"}>
        <Show when={props.cli.skills.length === 0}>
          <text fg={theme.muted}>no skills</text>
        </Show>
        <Show when={props.cli.skills.length > 0}>
          <box height={1} />
          <Show when={!!state.projectRoot && (props.cli.skills.some((s) => s._scope === "global") || props.cli.skills.some((s) => s._scope === "project"))} fallback={
            props.cli.skills.map((skill) => (
              <text fg={theme.fg}>
                <span fg={theme.success}>● </span>
                {skill.name}
                <span fg={theme.muted}>{skill.description ? ` — ${skill.description}` : ` (${skill.lines} lines)`}</span>
              </text>
            ))
          }>
            <Show when={props.cli.skills.some((s) => s._scope === "global")}>
              <text fg={theme.muted}>{t.global} ({props.cli.skills.filter((s) => s._scope === "global").length})</text>
              {props.cli.skills.filter((s) => s._scope === "global").map((skill) => (
                <text fg={theme.fg}>
                  <span fg={theme.success}>● </span>
                  {skill.name}
                  <span fg={theme.muted}>{skill.description ? ` — ${skill.description}` : ` (${skill.lines} lines)`}</span>
                </text>
              ))}
            </Show>
            <Show when={props.cli.skills.some((s) => s._scope === "project")}>
              <text fg={theme.muted}>{t.project} ({props.cli.skills.filter((s) => s._scope === "project").length})</text>
              {props.cli.skills.filter((s) => s._scope === "project").map((skill) => (
                <text fg={theme.fg}>
                  <span fg={theme.success}>● </span>
                  {skill.name}
                  <span fg={theme.muted}>{skill.description ? ` — ${skill.description}` : ` (${skill.lines} lines)`}</span>
                </text>
              ))}
            </Show>
          </Show>
        </Show>
      </Show>
    </box>
  )
}
