/**
 * Generate placeholder 16x16 PNG icons for each CLI adapter.
 * Run with: bun run script/generate-icons.ts
 */
import { Jimp } from "jimp"
import { join } from "node:path"

const ASSETS_DIR = join(import.meta.dir, "..", "src", "assets")

interface IconDef {
  id: string
  /** Hex color string */
  color: string
  /** Whether to draw a star-like pattern (for Anthropic logos) */
  starPattern?: boolean
}

const icons: IconDef[] = [
  { id: "claude-code", color: "#fab283", starPattern: true },
  { id: "claude-desktop", color: "#f5a742", starPattern: true },
  { id: "cursor", color: "#7fd88f" },
  { id: "vscode", color: "#5c9cf5" },
]

function hexToRGBA(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // RGBA packed as 0xRRGGBBAA
  return ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0
}

/** Simple star mask for a 16x16 image - center-weighted diamond/star shape */
const STAR_MASK = [
  "      ██      ",
  "     ████     ",
  "    ██████    ",
  "   ████████   ",
  "  ██████████  ",
  " ████████████ ",
  "██████████████",
  "██████████████",
  "██████████████",
  "██████████████",
  " ████████████ ",
  "  ██████████  ",
  "   ████████   ",
  "    ██████    ",
  "     ████     ",
  "      ██      ",
]

function isStarPixel(x: number, y: number): boolean {
  if (y < 0 || y >= STAR_MASK.length) return false
  const row = STAR_MASK[y]
  // Each "█" is 1 char wide in the pattern, but the pattern is 14 chars for a 16px wide image
  // Map x (0-15) to pattern index
  const idx = x
  if (idx < 0 || idx >= row.length) return false
  return row[idx] === "█"
}

async function generateIcon(def: IconDef) {
  const size = 16
  const color = hexToRGBA(def.color)
  // transparent background
  const image = new Jimp({ width: size, height: size, color: 0x00000000 })

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (def.starPattern) {
        // Use star mask - center the 14-wide pattern in 16 pixels
        const mx = x - 1
        if (isStarPixel(mx, y)) {
          image.setPixelColor(color, x, y)
        }
      } else {
        // Simple filled square with 1px transparent border for visual separation
        if (x >= 1 && x < size - 1 && y >= 1 && y < size - 1) {
          image.setPixelColor(color, x, y)
        }
      }
    }
  }

  const outPath = join(ASSETS_DIR, `${def.id}.png`)
  await image.write(outPath as `${string}.${string}`)
  console.log(`Generated: ${outPath}`)
}

async function main() {
  for (const icon of icons) {
    await generateIcon(icon)
  }
  console.log("Done generating icons.")
}

main()
