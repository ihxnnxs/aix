import { transformAsync } from "@babel/core"
// @ts-expect-error - Types not important.
import ts from "@babel/preset-typescript"
// @ts-expect-error - Types not important.
import solid from "babel-preset-solid"
import { mkdir, rename } from "fs/promises"
import type { BunPlugin } from "bun"

function createBuildPlugin(): BunPlugin {
  return {
    name: "aix-solid-transform",
    setup(build) {
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

      build.onLoad({ filter: /\.(ts|js)x?$/ }, async (args) => {
        if (args.path.includes("node_modules")) return undefined
        const code = await Bun.file(args.path).text()
        const transforms = await transformAsync(code, {
          filename: args.path,
          configFile: false,
          babelrc: false,
          presets: [
            [solid, { moduleName: "@opentui/solid", generate: "universal" }],
            [ts, { isTSX: true, allExtensions: true }],
          ],
        })
        return { contents: transforms?.code ?? "", loader: "js" }
      })
    },
  }
}

const target = process.argv[2]
if (!target) {
  console.error("Usage: bun run script/build-single.ts <target>")
  process.exit(1)
}

const parts = target.split("-")
const os = parts[1]
const arch = parts[2]
const outDir = `dist/aix-${os}-${arch}`
const ext = os === "windows" ? ".exe" : ""
const binName = `aix${ext}`

console.log(`Building aix for ${target}...`)
await mkdir(outDir, { recursive: true })

const result = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: outDir,
  target,
  compile: true,
  plugins: [createBuildPlugin()],
})

if (result.success) {
  const outputPath = result.outputs[0].path
  const desiredPath = `${outDir}/${binName}`
  if (outputPath !== desiredPath) {
    await rename(outputPath, desiredPath)
  }
  console.log(`✓ ${desiredPath}`)
} else {
  console.error(`✗ Build failed:`)
  for (const log of result.logs) {
    console.error(`  ${log}`)
  }
  process.exit(1)
}
