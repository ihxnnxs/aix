# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is aix

aix (AI eXchange) is a universal tool for managing AI coding tool configurations. It provides an interactive TUI to transfer MCP server configs between Claude Code, Cursor, VS Code, OpenCode, Qwen Code, and 16 other tools. Supports both global and project-scoped configs.

## Commands

```bash
bun run dev              # Run CLI in dev mode (bun run src/index.ts)
bun test                 # Run all tests
bun test tests/adapters  # Run adapter tests only
bun run build            # Cross-platform binary build (linux/macOS/windows)
bun run typecheck        # Type-check without emitting (tsc --noEmit)
```

Default to using Bun instead of Node.js for all operations. Use `Bun.file()` over `node:fs`, `bun test` over jest/vitest, `bun install` over npm/yarn.

## Architecture

**Generic adapter** — all 21 AI tools share one `GenericMCPAdapter` class (`src/adapters/generic.ts`), configured by `CLIDef` definitions in `src/adapters/detector.ts`. Each CLIDef specifies config paths, server key, and optional project-scoped paths. No per-tool adapter files needed.

**Scope system** — adapters support `"global" | "project" | "all"` scopes. `findProjectRoot()` in `src/utils/project.ts` walks up from cwd looking for `.git`. Project-scoped configs (e.g., `.mcp.json`, `.cursor/mcp.json`) are read alongside global configs. `MCPServer._scope` tracks origin.

**TUI** — built with OpenTUI (`@opentui/core`) + Solid.js (`@opentui/solid`). The component tree is `App → AppProvider → Routes (home/list/transfer)`. State is managed via Solid.js `createStore` in `src/tui/context/app.tsx`. JSX uses `@opentui/solid` as the import source, not React.

**CLI** — yargs-based with three commands: `list`, `transfer`, `doctor`. Running `aix` without args launches the TUI home screen.

**Version** — single source of truth in `package.json`, imported via `src/version.ts`.

## Key conventions

- Path aliases: `@/*` → `src/*`, `@tui/*` → `src/tui/*` (configured in tsconfig.json)
- `bunfig.toml` preloads `@opentui/solid/preload` for both dev and test
- Build script (`script/build.ts`) uses a custom Babel plugin to transform Solid JSX and redirect `solid-js` server imports to client
- To add a new AI tool: add a `CLIDef` entry in `src/adapters/detector.ts` with `paths()`, optional `serverKey`, `projectPaths()`, `projectServerKey`
- Tests use `mkdtempSync` for isolated temp directories
- ASCII art logo uses "pagga" figlet font style with `░` block characters
