<p align="center">
  <br />
  <code>░█▀█░▀█▀░█░█░</code><br />
  <code>░█▀█░░█░░▄▀▄░</code><br />
  <code>░▀░▀░▀▀▀░▀░▀░</code><br />
  <br />
  <strong>AI eXchange</strong><br />
  <sub>您所有的 AI 工具，尽在一处。</sub>
</p>

<p align="center">
  <a href="https://github.com/ihxnnxs/aix/releases"><img src="https://img.shields.io/github/v/release/ihxnnxs/aix" alt="Release" /></a>
  <a href="https://github.com/ihxnnxs/aix/actions"><img src="https://img.shields.io/github/actions/workflow/status/ihxnnxs/aix/ci.yml" alt="Build" /></a>
  <a href="https://github.com/ihxnnxs/aix/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ihxnnxs/aix" alt="License" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ru.md">Русский</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

---

通过交互式 TUI 在 AI 编程工具之间传输 MCP 服务器配置。支持 16 种工具的全局和项目级配置。

## 安装

```bash
npm install -g @ihxnnxs/aix
```

## 使用

```bash
aix              # 启动交互式 TUI
aix list         # 查看所有工具的 MCP 服务器
aix transfer     # 在工具之间传输 MCP 服务器
aix doctor       # 诊断工具检测
```

## 支持的工具

| 工具 | 全局 | 项目 |
|------|:----:|:----:|
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

## 功能

- **传输** — 从一个工具中选择 MCP 服务器，自动适配格式传输到另一个工具
- **项目作用域** — 在项目目录中运行 `aix`，同时管理全局和项目级配置
- **自动检测** — 扫描系统中已安装的 AI 工具并读取其配置
- **备份** — 在任何更改之前自动备份配置 (`~/.config/aix/backups/`)
- **警告** — 传输前标记不兼容的字段

## 开发

```bash
bun install
bun run dev          # 开发模式运行
bun test             # 运行测试
bun run build        # 构建跨平台二进制文件
```

## 许可证

MIT
