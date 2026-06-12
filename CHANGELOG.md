# Changelog

## 0.7.0

- Upgraded `aix doctor` into a script-friendly config and security diagnostic command.
- Added `aix doctor --json`, `--strict`, `--no-update`, and safe `--fix` support.
- Detect broken JSON/TOML MCP configs, invalid server shapes, missing transports, duplicate server names, bad URLs, and missing command paths.
- Flag security risks without leaking secret values: shell inline commands, shell metacharacters, HTTP remote URLs, URL credentials/query secrets, sensitive env/header keys, inline secret-looking values, and loose permissions on secret-bearing config files.
- `doctor --fix` can tighten secret-bearing config files to `0600` on Unix-like systems.

## 0.6.0

- Kept a single downloadable `aix` binary with both CLI commands and the TUI.
- Made `aix list` script-friendly with text output, `--json`, `--type`, `--scope`, `--all`, and `--tui`.
- Added SHA-256 release checksums and checksum validation for installer/update downloads.
- Added safety backups before restore and rejected unsafe prune values.
- Preserved flat skill files during transfer instead of rewriting them as `name/SKILL.md` directories.

## 0.5.0

- Made `bun run typecheck` part of the release gate.
- Fixed adapter capabilities for rules, skills, and agents.
- Detect tools from existing rules, skills, or agents paths even when MCP config is absent.
- Create parent directories before writing new MCP config files.
- Updated TUI typing compatibility for current OpenTUI/Solid packages.
