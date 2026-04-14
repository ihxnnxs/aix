import { createContext, useContext } from "solid-js"
import type { ParentProps } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { KVStore } from "../../config/store"

export interface Theme {
  id: string
  name: string
  bg: string
  fg: string
  accent: string
  muted: string
  success: string
  warning: string
  error: string
  border: string
  borderFocused: string
}

const THEMES: Record<string, Theme> = {
  default: {
    id: "default",
    name: "Default",
    bg: "#0a0a0a",
    fg: "#eeeeee",
    accent: "#fab283",
    muted: "#808080",
    success: "#7fd88f",
    warning: "#f5a742",
    error: "#e06c75",
    border: "#484848",
    borderFocused: "#606060",
  },
  dracula: {
    id: "dracula",
    name: "Dracula",
    bg: "#282a36",
    fg: "#f8f8f2",
    accent: "#bd93f9",
    muted: "#6272a4",
    success: "#50fa7b",
    warning: "#f1fa8c",
    error: "#ff5555",
    border: "#44475a",
    borderFocused: "#6272a4",
  },
  monokai: {
    id: "monokai",
    name: "Monokai",
    bg: "#272822",
    fg: "#f8f8f2",
    accent: "#f92672",
    muted: "#75715e",
    success: "#a6e22e",
    warning: "#e6db74",
    error: "#f92672",
    border: "#49483e",
    borderFocused: "#75715e",
  },
  gruvbox: {
    id: "gruvbox",
    name: "Gruvbox",
    bg: "#282828",
    fg: "#ebdbb2",
    accent: "#fabd2f",
    muted: "#928374",
    success: "#b8bb26",
    warning: "#fe8019",
    error: "#fb4934",
    border: "#504945",
    borderFocused: "#7c6f64",
  },
  nord: {
    id: "nord",
    name: "Nord",
    bg: "#2e3440",
    fg: "#eceff4",
    accent: "#88c0d0",
    muted: "#4c566a",
    success: "#a3be8c",
    warning: "#ebcb8b",
    error: "#bf616a",
    border: "#3b4252",
    borderFocused: "#434c5e",
  },
}

export function getAllThemes(): Theme[] {
  return Object.values(THEMES)
}

export function getThemeById(id: string): Theme {
  return { ...(THEMES[id] ?? THEMES.default) }
}

const kvStore = new KVStore()
const initialTheme = getThemeById(kvStore.get<string>("theme") ?? "default")
const [themeStore, setThemeStore] = createStore<Theme>(initialTheme)

export function switchTheme(id: string): void {
  const theme = getThemeById(id)
  setThemeStore(reconcile(theme))
  kvStore.set("theme", id)
}

const ThemeContext = createContext<Theme>(themeStore)

export function ThemeProvider(props: ParentProps) {
  return <ThemeContext.Provider value={themeStore}>{props.children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  return useContext(ThemeContext)!
}
