import { createContext, useContext } from "solid-js"
import type { ParentProps } from "solid-js"
import { createStore } from "solid-js/store"
import type { Adapter, MCPServer, DetectResult } from "../../adapters/types"

export type Route = "home" | "list" | "transfer"

export interface CLIState {
  adapter: Adapter
  detection: DetectResult
  servers: MCPServer[]
}

export interface AppState {
  route: Route
  clis: CLIState[]
  loading: boolean
  projectRoot: string | null
}

export interface AppActions {
  navigate(route: Route): void
  refresh(): Promise<void>
}

const AppContext = createContext<[AppState, AppActions]>()

export function AppProvider(props: ParentProps<{ adapters: Adapter[]; projectRoot?: string | null; initialRoute?: Route }>) {
  const [state, setState] = createStore<AppState>({
    route: props.initialRoute ?? "home",
    clis: [],
    loading: true,
    projectRoot: props.projectRoot ?? null,
  })

  const actions: AppActions = {
    navigate(route: Route) {
      setState("route", route)
    },
    async refresh() {
      setState("loading", true)
      const clis: CLIState[] = []
      for (const adapter of props.adapters) {
        const detection = await adapter.detect()
        let servers: MCPServer[] = []
        if (detection.installed) {
          try { servers = await adapter.getMCPServers() } catch {}
        }
        clis.push({ adapter, detection, servers })
      }
      setState({ clis, loading: false })
    },
  }

  // initial scan
  actions.refresh()

  return <AppContext.Provider value={[state, actions]}>{props.children}</AppContext.Provider>
}

export function useApp(): [AppState, AppActions] {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
