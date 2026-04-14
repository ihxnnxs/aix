<p align="center">
  <br />
  <code>░█▀█░▀█▀░█░█░</code><br />
  <code>░█▀█░░█░░▄▀▄░</code><br />
  <code>░▀░▀░▀▀▀░▀░▀░</code><br />
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

インタラクティブなTUIを通じて、AIコーディングツール間でMCPサーバー設定を転送します。グローバルおよびプロジェクトスコープの設定をサポートする16のツールに対応。

## インストール

```bash
npm install -g @ihxnnxs/aix
```

## 使い方

```bash
aix              # インタラクティブTUIを起動
aix list         # すべてのツールのMCPサーバーを表示
aix transfer     # ツール間でMCPサーバーを転送
aix doctor       # ツール検出の診断
```

## 対応ツール

| ツール | グローバル | プロジェクト |
|--------|:----------:|:------------:|
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

## 機能

- **転送** — 一つのツールからMCPサーバーを選択し、フォーマットを自動変換して別のツールに転送
- **プロジェクトスコープ** — プロジェクトディレクトリ内で `aix` を実行し、グローバルとプロジェクトレベルの設定を管理
- **自動検出** — システムにインストールされたAIツールをスキャンし、設定を読み取り
- **バックアップ** — 変更前に設定を自動バックアップ (`~/.config/aix/backups/`)
- **警告** — 転送前に互換性のないフィールドを表示

## 開発

```bash
bun install
bun run dev          # 開発モードで実行
bun test             # テストを実行
bun run build        # クロスプラットフォームバイナリをビルド
```

## ライセンス

MIT
