# AGENTS.md

High-signal guidance for AI agents working in the aix repo.

## Environment

- **Bun only.** Use `bun` for install, run, test, and build. Never `npm` / `node` / `npx`.
- Prefer `Bun.file()` over `node:fs`, `bun test` over jest/vitest.

## Commands

```bash
bun run dev          # Run CLI in dev mode (bun run src/index.ts)
bun test             # Run all tests
bun test tests/adapters   # Run a single test file or directory
bun run build        # Cross-platform binary build (linux/macOS/windows)
bun run typecheck    # Type-check without emitting (tsc --noEmit)
```

## Architecture

- **Generic adapter** — all 21 AI tools share one `GenericMCPAdapter` (`src/adapters/generic.ts`), configured by `CLIDef` entries in `src/adapters/detector.ts`. No per-tool adapter files.
- **Scope system** — adapters support `"global" | "project" | "all"`. `findProjectRoot()` in `src/utils/project.ts` walks up from cwd looking for `.git`. Project-scoped configs (e.g., `.mcp.json`, `.cursor/mcp.json`) are read alongside global configs. `MCPServer._scope` tracks origin.
- **TUI** — built with OpenTUI (`@opentui/core`) + Solid.js (`@opentui/solid`). Component tree: `App → AppProvider → Routes (home/list/transfer)`. State is managed via Solid.js `createStore` in `src/tui/context/app.tsx`.
- **CLI** — yargs-based with commands: `list`, `transfer`, `restore`, `doctor`. Running `aix` without args launches the TUI home screen.
- **Version** — single source of truth in `package.json`, imported via `src/version.ts`.

## Build & Toolchain Quirks

- `bunfig.toml` preloads `@opentui/solid/preload` for both dev and test.
- `script/build.ts` uses a **custom Babel plugin** to:
  - Transform Solid JSX in `.ts` files (the upstream plugin only handles `.jsx` / `.tsx`).
  - Redirect `solid-js` server imports to client builds.
- Path aliases: `@/*` → `src/*`, `@tui/*` → `src/tui/*` (configured in `tsconfig.json`).
- JSX import source is `@opentui/solid`, not React.

## Adding a New AI Tool

Add a `CLIDef` entry in `src/adapters/detector.ts` with:
- `paths()` for global config paths
- optional `serverKey`, `projectPaths()`, `projectServerKey`

## Testing

- Tests use `mkdtempSync` for isolated temp directories.
- Integration tests verify dry-run and transfer-then-restore workflows.

## Style

- ASCII art logo uses "pagga" figlet font style with `░` block characters.
