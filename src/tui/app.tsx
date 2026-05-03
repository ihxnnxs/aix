import { createCliRenderer } from "@opentui/core"
import { render, useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { Match, Switch, Show, createSignal } from "solid-js"
import { ThemeProvider, useTheme } from "./context/theme"
import { AppProvider, useApp, type Route } from "./context/app"
import { KEYBINDS, matchKey } from "./context/keybind"
import type { Adapter } from "../adapters/types"
import { KVStore } from "../config/store"

import { Home } from "./routes/home"
import { List } from "./routes/list"
import { Transfer } from "./routes/transfer"
import { Settings } from "./routes/settings"
import { Backups } from "./routes/backups"
import { BootSequence } from "./components/boot-sequence"

function AppContent() {
  const theme = useTheme()
  const [state, actions] = useApp()
  const dims = useTerminalDimensions()
  const store = new KVStore()
  const skipBoot = store.get<boolean>("skipBootAnimation") ?? false
  const [booted, setBooted] = createSignal(skipBoot)

  useKeyboard((key: any) => {
    if (matchKey(key, KEYBINDS.quit)) process.exit(0)
  })

  return (
    <box width={dims().width} height={dims().height} backgroundColor={theme.bg}>
      <Show when={booted()} fallback={<BootSequence onComplete={() => setBooted(true)} />}>
        <Show when={!state.loading} fallback={<text fg={theme.muted}>Loading...</text>}>
          <Switch>
            <Match when={state.route === "home"}>
              <Home />
            </Match>
            <Match when={state.route === "list"}>
              <List />
            </Match>
            <Match when={state.route === "transfer"}>
              <Transfer />
            </Match>
            <Match when={state.route === "settings"}>
              <Settings />
            </Match>
            <Match when={state.route === "backups"}>
              <Backups />
            </Match>
          </Switch>
        </Show>
      </Show>
    </box>
  )
}

function App(props: { adapters: Adapter[]; projectRoot: string | null; initialRoute?: Route }) {
  return (
    <ThemeProvider>
      <AppProvider adapters={props.adapters} projectRoot={props.projectRoot} initialRoute={props.initialRoute}>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  )
}

export async function startTUI(adapters: Adapter[], projectRoot?: string | null, initialRoute?: string) {
  const renderer = await createCliRenderer({
    targetFps: 60,
    exitOnCtrlC: false,
    autoFocus: false,
  })
  await render(() => <App adapters={adapters} projectRoot={projectRoot ?? null} initialRoute={initialRoute as Route} />, renderer)
}
