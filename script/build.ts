import { transformAsync } from "@babel/core"
// @ts-expect-error - Types not important.
import ts from "@babel/preset-typescript"
// @ts-expect-error - Types not important.
import solid from "babel-preset-solid"
import { mkdir, rename } from "fs/promises"
import type { BunPlugin } from "bun"

/**
 * Custom solid transform plugin that also handles .ts files containing JSX.
 * The upstream @opentui/solid/bun-plugin only transforms .jsx/.tsx files,
 * but this project uses JSX syntax in .ts files.
 */
function createBuildPlugin(): BunPlugin {
  return {
    name: "aix-solid-transform",
    setup(build) {
      // Redirect solid-js server imports to client
      build.onLoad({ filter: /[/\\]node_modules[/\\]solid-js[/\\]dist[/\\]server\.js(?:[?#].*)?$/ }, async (args) => {
        const path = args.path.replace("server.js", "solid.js")
        return { contents: await Bun.file(path).text(), loader: "js" }
      })

      build.onLoad(
        { filter: /[/\\]node_modules[/\\]solid-js[/\\]store[/\\]dist[/\\]server\.js(?:[?#].*)?$/ },
        async (args) => {
          const path = args.path.replace("server.js", "store.js")
          return { contents: await Bun.file(path).text(), loader: "js" }
        },
      )

      // Transform all source .ts/.tsx/.jsx files through Babel with solid preset
      build.onLoad({ filter: /\.(ts|js)x?$/ }, async (args) => {
        if (args.path.includes("node_modules")) return undefined

        const code = await Bun.file(args.path).text()

        const transforms = await transformAsync(code, {
          filename: args.path,
          configFile: false,
          babelrc: false,
          presets: [
            [
              solid,
              {
                moduleName: "@opentui/solid",
                generate: "universal",
              },
            ],
            [ts, { isTSX: true, allExtensions: true }],
          ],
        })

        return {
          contents: transforms?.code ?? "",
          loader: "js",
        }
      })
    },
  }
}

const targets = [
  "bun-linux-x64",
  "bun-linux-arm64",
  "bun-darwin-arm64",
  "bun-darwin-x64",
  "bun-windows-x64",
] as const

function opentuiPackageName(target: typeof targets[number]): string {
  const parts = target.split("-")
  const os = parts[1] === "windows" ? "win32" : parts[1]
  const arch = parts[2]
  return `@opentui/core-${os}-${arch}`
}

async function ensureOpenTUIPlatformPackages(): Promise<void> {
  const missing = []

  for (const target of targets) {
    const pkg = opentuiPackageName(target)
    const exists = await Bun.file(`node_modules/${pkg}/package.json`).exists()
    if (!exists) missing.push(pkg)
  }

  if (missing.length === 0) return

  console.log(`Installing OpenTUI platform packages: ${missing.join(", ")}`)
  const proc = Bun.spawn(["bun", "install", "--cpu", "*", "--os", "*"], {
    stdout: "inherit",
    stderr: "inherit",
  })
  const exitCode = await proc.exited
  if (exitCode !== 0) throw new Error("Failed to install OpenTUI platform packages")
}

console.log("Building aix...")

await ensureOpenTUIPlatformPackages()

let failed = false

for (const target of targets) {
  const parts = target.split("-")
  const os = parts[1]
  const arch = parts[2]
  const outDir = `dist/aix-${os}-${arch}`
  const ext = os === "windows" ? ".exe" : ""
  const binName = `aix${ext}`

  console.log(`  ${target}...`)

  try {
    await mkdir(outDir, { recursive: true })

    const result = await Bun.build({
      entrypoints: ["src/index.ts"],
      outdir: outDir,
      target,
      compile: true,
      plugins: [createBuildPlugin()],
    })

    if (result.success) {
      // Bun.build with compile ignores `naming`, so rename the output
      const outputPath = result.outputs[0].path
      const desiredPath = `${outDir}/${binName}`
      if (outputPath !== desiredPath) {
        await rename(outputPath, desiredPath)
      }
      console.log(`  ✓ ${desiredPath}`)
    } else {
      failed = true
      console.error(`  ✗ ${target} failed:`)
      for (const log of result.logs) {
        console.error(`    ${log}`)
      }
    }
  } catch (e) {
    failed = true
    console.error(`  ✗ ${target} failed: ${e instanceof Error ? e.message : e}`)
  }
}

if (failed) process.exit(1)

console.log("\nDone!")
