<p align="center">
  <br />
  <code>░█▀█░▀█▀░█░█░</code><br />
  <code>░█▀█░░█░░▄▀▄░</code><br />
  <code>░▀░▀░▀▀▀░▀░▀░</code><br />
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

Перенос конфигураций MCP серверов между AI инструментами для разработки через интерактивный TUI. Поддерживает 16 инструментов с глобальными и проектными конфигурациями.

## Установка

```bash
npm install -g @ihxnnxs/aix
```

## Использование

```bash
aix              # Запустить интерактивный TUI
aix list         # Просмотр MCP серверов во всех инструментах
aix transfer     # Перенос MCP серверов между инструментами
aix doctor       # Диагностика обнаружения инструментов
```

## Поддерживаемые инструменты

| Инструмент | Глобальный | Проектный |
|-----------|:----------:|:---------:|
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

## Возможности

- **Перенос** — выбирайте MCP серверы из одного инструмента и переносите в другой с автоматической адаптацией формата
- **Проектный скоуп** — запустите `aix` внутри проекта для управления глобальными и проектными конфигурациями
- **Автоопределение** — сканирует систему на наличие установленных AI инструментов и читает их конфигурации
- **Бэкапы** — конфигурации сохраняются перед любыми изменениями (`~/.config/aix/backups/`)
- **Предупреждения** — несовместимые поля отмечаются перед переносом

## Разработка

```bash
bun install
bun run dev          # Запуск в режиме разработки
bun test             # Запуск тестов
bun run build        # Сборка кроссплатформенных бинарников
```

## Лицензия

MIT
