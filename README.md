<p align="center">
  <br />
  <code>░█▀█░▀█▀░█░█░</code><br />
  <code>░█▀█░░█░░▄▀▄░</code><br />
  <code>░▀░▀░▀▀▀░▀░▀░</code><br />
  <br />
  <strong>AI eXchange</strong><br />
  <sub>All your AI tools, one place.</sub>
</p>

<p align="center">
  <a href="https://github.com/ihxnnxs/aix/releases"><img src="https://img.shields.io/github/v/release/ihxnnxs/aix" alt="Release" /></a>
  <a href="https://github.com/ihxnnxs/aix/actions"><img src="https://img.shields.io/github/actions/workflow/status/ihxnnxs/aix/ci.yml" alt="Build" /></a>
  <a href="https://github.com/ihxnnxs/aix/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ihxnnxs/aix" alt="License" /></a>
</p>

<p align="center">
  <a href="README.ru.md">Русский</a> · <a href="README.zh.md">中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

---

Transfer MCP server configs between AI coding tools through an interactive TUI. Supports 16 tools with both global and project-scoped configurations.

## Install

```bash
npm install -g @ihxnnxs/aix
```

## Usage

```bash
aix              # Launch interactive TUI
aix list         # View MCP servers across tools
aix transfer     # Transfer MCP servers between tools
aix doctor       # Diagnose CLI tool detection
```

## Supported Tools

| Tool | Global | Project |
|------|:------:|:-------:|
| Claude Code | ✓ | ✓ |
| Claude Desktop | ✓ | |
| Cursor | ✓ | ✓ |
| VS Code | ✓ | ✓ |
| Windsurf | ✓ | |
| Cline | ✓ | |
| Roo Code | ✓ | ✓ |
| Kilo Code | ✓ | ✓ |
| TRAE | ✓ | ✓ |
| OpenCode | ✓ | ✓ |
| Qwen Code | ✓ | ✓ |
| Claude for IDE | ✓ | |
| Droid | ✓ | ✓ |
| Goose | ✓ | |
| Crush | ✓ | ✓ |
| Eigent | ✓ | |

## Features

- **Transfer** — select MCP servers from one tool, transfer to another with automatic format adaptation
- **Project scope** — run `aix` inside a project to manage both global and project-scoped configs
- **Auto-detect** — scans your system for installed AI tools and reads their configurations
- **Backups** — configs are backed up before any changes (`~/.config/aix/backups/`)
- **Warnings** — incompatible fields flagged before transfer

## Development

```bash
bun install
bun run dev          # Run in dev mode
bun test             # Run tests
bun run build        # Build cross-platform binaries
```

## License

MIT
