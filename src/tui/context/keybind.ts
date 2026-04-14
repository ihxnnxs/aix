export const KEYBINDS = {
  quit: ["q", "ctrl+c"],
  transfer: ["t"],
  list: ["l"],
  back: ["escape", "backspace"],
  select: ["return"],
  toggle: [" ", "space"],
  nextPanel: ["tab"],
  up: ["up", "k"],
  down: ["down", "j"],
  left: ["left", "h"],
  right: ["right", "l"],
  scopeToggle: ["s"],
} as const

export function matchKey(
  key: { name: string; ctrl?: boolean; shift?: boolean },
  binds: readonly string[],
): boolean {
  for (const bind of binds) {
    if (bind.startsWith("ctrl+")) {
      if (key.ctrl && key.name === bind.slice(5)) return true
    } else if (key.name === bind) {
      return true
    }
  }
  return false
}
