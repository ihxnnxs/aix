import { getAllCLIDefs } from "./detector"
import { GenericMCPAdapter } from "./generic"
import type { Adapter } from "./types"

export function createAllAdapters(projectRoot?: string | null): Adapter[] {
  return getAllCLIDefs().map((def) => new GenericMCPAdapter(def, projectRoot))
}
