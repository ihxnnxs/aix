import { createContext, useContext } from "solid-js"
import type { ParentProps } from "solid-js"

export interface Theme {
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

const defaultTheme: Theme = {
  bg: "#0a0a0a",
  fg: "#eeeeee",
  accent: "#fab283",
  muted: "#808080",
  success: "#7fd88f",
  warning: "#f5a742",
  error: "#e06c75",
  border: "#484848",
  borderFocused: "#606060",
}

const ThemeContext = createContext<Theme>(defaultTheme)

export function ThemeProvider(props: ParentProps) {
  return <ThemeContext.Provider value={defaultTheme}>{props.children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  return useContext(ThemeContext)!
}
