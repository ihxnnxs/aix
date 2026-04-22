<p align="center">
  <br />
  <pre>░█▀█░▀█▀░█░█░
░█▀█░░█░░▄▀▄░
░▀░▀░▀▀▀░▀░▀░</pre><br />
  <br />
  <strong>AI eXchange</strong><br />
  <sub>Все ваши AI инструменты в одном месте.</sub>
</p>

<p align="center">
  <a href="https://github.com/ihxnnxs/aix/releases"><img src="https://img.shields.io/github/v/release/ihxnnxs/aix" alt="Release" /></a>
  <a href="https://github.com/ihxnnxs/aix/actions"><img src="https://img.shields.io/github/actions/workflow/status/ihxnnxs/aix/ci.yml" alt="Build" /></a>
  <a href="https://github.com/ihxnnxs/aix/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ihxnnxs/aix" alt="License" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

---

Перенос конфигураций MCP серверов между AI инструментами для разработки через интерактивный TUI. Поддерживает 21 инструмент с глобальными и проектными конфигурациями.

## Установка

```bash
curl -fsSL https://raw.githubusercontent.com/ihxnnxs/aix/main/install.sh | bash
```

## Использование

```bash
aix              # Запустить интерактивный TUI
aix list         # Просмотр MCP серверов во всех инструментах
aix transfer     # Перенос MCP серверов между инструментами
aix doctor       # Диагностика обнаружения инструментов
```

## Поддерживаемые инструменты

| Инструмент | MCP Глоб. | MCP Проект | Rules | Skills | Agents |
|-----------|:----------:|:-----------:|:-----:|:------:|:------:|
| Claude Code | ✓ | ✓ | ✓ `CLAUDE.md` | ✓ | ✓ |
| Claude Desktop | ✓ | | | | |
| Cursor | ✓ | ✓ | ✓ `.cursorrules` | ✓ | ✓ |
| VS Code | ✓ | ✓ | ✓ `copilot-instructions.md` | | |
| Windsurf | ✓ | | ✓ `.windsurfrules` | | |
| Cline | ✓ | | ✓ `.clinerules` | | |
| Roo Code | ✓ | ✓ | ✓ `.roo/rules/` | | |
| Kilo Code | ✓ | ✓ | ✓ `.kilo/rules/` | | |
| TRAE | ✓ | ✓ | ✓ `project_rules.md` | | |
| OpenCode | ✓ | ✓ | ✓ `AGENTS.md` | ✓ | ✓ |
| Qwen Code | ✓ | ✓ | ✓ `AGENTS.md` | ✓ | ✓ |
| Claude for IDE | ✓ | | | | |
| Droid | ✓ | ✓ | ✓ `.factory/` | | |
| Goose | ✓ | | ✓ `.goosehints` | | |
| Crush | ✓ | ✓ | ✓ `AGENTS.md` | | |
| Eigent | ✓ | | | | |
| Gemini CLI | ✓ | ✓ | ✓ `GEMINI.md` | ✓ | ✓ |
| Amazon Q | ✓ | ✓ | ✓ `.amazonq/rules/` | | |
| Amp | ✓ | ✓ | ✓ `AGENT.md` | ✓ | |
| Codex CLI | ✓ | ✓ | ✓ `AGENTS.md` | ✓ | |
| Copilot CLI | ✓ | | ✓ `copilot-instructions.md` | | |

## Возможности

- **Перенос** - выбирайте MCP серверы из одного инструмента и переносите в другой с автоматической адаптацией формата
- **Перенос агентов** — перенос markdown-файлов субагентов между AI CLI
- **Проектный скоуп** - запустите `aix` внутри проекта для управления глобальными и проектными конфигурациями
- **Автоопределение** - сканирует систему на наличие установленных AI инструментов и читает их конфигурации
- **Бэкапы** - конфигурации сохраняются перед любыми изменениями (`~/.config/aix/backups/`)
- **Откат изменений** — откатите изменения конфигурации через `aix restore` или экран Backups в TUI
- **Сухой прогон** — `aix transfer --dry-run` или `d` в TUI позволяет просмотреть действия без записи
- **Предупреждения** - несовместимые поля отмечаются перед переносом

## Разработка

```bash
bun install
bun run dev          # Запуск в режиме разработки
bun test             # Запуск тестов
bun run build        # Сборка кроссплатформенных бинарников
```

## Лицензия

MIT
