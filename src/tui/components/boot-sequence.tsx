import { createSignal, onMount, onCleanup, Show, createEffect } from "solid-js"
import { useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "../context/theme"
import { getStrings } from "../i18n"

const LOGO_LINES = [
  "░█▀█░▀█▀░█░█░",
  "░█▀█░░█░░▄▀▄░",
  "░▀░▀░▀▀▀░▀░▀░",
]

type CharSlot = { row: number; col: number; char: string }

const CHAR_SLOTS: CharSlot[] = []
for (let row = 0; row < LOGO_LINES.length; row++) {
  for (let col = 0; col < LOGO_LINES[row].length; col++) {
    const char = LOGO_LINES[row][col]
    if (char !== " ") {
      CHAR_SLOTS.push({ row, col, char })
    }
  }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function emptyGrid(): string[][] {
  return LOGO_LINES.map((line) => Array(line.length).fill(" "))
}

export function BootSequence(props: { onComplete: () => void }) {
  const theme = useTheme()
  const dims = useTerminalDimensions()
  const t = getStrings()

  const [phase, setPhase] = createSignal<"particles" | "subtitle" | "done">("particles")
  const [subtitleIndex, setSubtitleIndex] = createSignal(0)
  const [displayGrid, setDisplayGrid] = createSignal<string[][]>(emptyGrid())

  onMount(() => {
    const order = shuffle(CHAR_SLOTS.map((_, i) => i))
    let i = 0
    const interval = setInterval(() => {
      if (phase() !== "particles") return

      if (i >= order.length) {
        clearInterval(interval)
        setTimeout(() => setPhase("subtitle"), 300)
        return
      }

      const batchSize = 1 + Math.floor(Math.random() * 3)
      setDisplayGrid((prev) => {
        const next = prev.map((row) => [...row])
        for (let j = 0; j < batchSize && i < order.length; j++, i++) {
          const slot = CHAR_SLOTS[order[i]]
          next[slot.row][slot.col] = slot.char
        }
        return next
      })
    }, 25)

    onCleanup(() => clearInterval(interval))
  })

  createEffect(() => {
    if (phase() !== "subtitle") return

    const text = t.allYourAiTools
    let i = 0
    const interval = setInterval(() => {
      if (i <= text.length) {
        setSubtitleIndex(i++)
      } else {
        clearInterval(interval)
        setTimeout(() => {
          setPhase("done")
          props.onComplete()
        }, 500)
      }
    }, 25)

    onCleanup(() => clearInterval(interval))
  })

  return (
    <box width={dims().width} height={dims().height} backgroundColor={theme.bg} flexDirection="column">
      {/* Logo — centered, doesn't move */}
      <box flexGrow={1} flexDirection="column" alignItems="center" justifyContent="center" width="100%">
        <Show when={phase() === "particles"}>
          {displayGrid().map((row) => (
            <text fg={theme.accent}>{row.join("")}</text>
          ))}
        </Show>

        <Show when={phase() !== "particles"}>
          {LOGO_LINES.map((line) => (
            <text fg={theme.accent}>{line}</text>
          ))}
        </Show>
      </box>

      {/* Subtitle — fixed at bottom */}
      <box height={3} flexDirection="column" alignItems="center" justifyContent="center" width="100%">
        <text fg={theme.muted}>{t.allYourAiTools.slice(0, subtitleIndex())}</text>
      </box>
    </box>
  )
}
