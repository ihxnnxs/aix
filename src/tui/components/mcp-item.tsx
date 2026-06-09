import { useTheme } from "../context/theme"
import type { MCPServer } from "../../adapters/types"

export function MCPItem(props: { server: MCPServer }) {
  const theme = useTheme()
  return <text fg={theme.fg}>● {props.server.name}</text>
}
