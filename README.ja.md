<p align="center">
  <br />
  <pre>░█▀█░▀█▀░█░█░
░█▀█░░█░░▄▀▄░
░▀░▀░▀▀▀░▀░▀░</pre><br />
  <br />
  <strong>AI eXchange</strong><br />
  <sub>すべてのAIツールを一箇所に。</sub>
</p>

<p align="center">
  <a href="https://github.com/ihxnnxs/aix/releases"><img src="https://img.shields.io/github/v/release/ihxnnxs/aix" alt="Release" /></a>
  <a href="https://github.com/ihxnnxs/aix/actions"><img src="https://img.shields.io/github/actions/workflow/status/ihxnnxs/aix/ci.yml" alt="Build" /></a>
  <a href="https://github.com/ihxnnxs/aix/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ihxnnxs/aix" alt="License" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh.md">中文</a> · <a href="README.ko.md">한국어</a>
</p>

---

インタラクティブなTUIを通じて、AIコーディングツール間でMCPサーバー設定を転送します。グローバルおよびプロジェクトスコープの設定をサポートする21のツールに対応。

## インストール

```bash
curl -fsSL https://raw.githubusercontent.com/ihxnnxs/aix/main/install.sh | bash
```

## 使い方

```bash
aix              # インタラクティブTUIを起動
aix list         # すべてのツールのMCPサーバーを表示
aix transfer     # ツール間でMCPサーバーを転送
aix doctor       # ツール検出の診断
```

## 対応ツール

| ツール | MCP グローバル | MCP プロジェクト | Rules | Skills | Agents |
|--------|:----------:|:-----------:|:-----:|:------:|:------:|
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

## 機能

- **転送** - 一つのツールからMCPサーバーを選択し、フォーマットを自動変換して別のツールに転送
- **エージェント転送** — AI CLI間でサブエージェントのmarkdownファイルを転送
- **プロジェクトスコープ** - プロジェクトディレクトリ内で `aix` を実行し、グローバルとプロジェクトレベルの設定を管理
- **自動検出** - システムにインストールされたAIツールをスキャンし、設定を読み取り
- **バックアップ** - 変更前に設定を自動バックアップ (`~/.config/aix/backups/`)
- **復元** — `aix restore` またはTUIのBackups画面で設定変更を元に戻す
- **ドライラン** — `aix transfer --dry-run` またはTUIで `d` を押して書き込まずに操作をプレビュー
- **警告** - 転送前に互換性のないフィールドを表示

## 開発

```bash
bun install
bun run dev          # 開発モードで実行
bun test             # テストを実行
bun run build        # クロスプラットフォームバイナリをビルド
```

## ライセンス

MIT
