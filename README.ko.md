<p align="center">
  <br />
  <code>░█▀█░▀█▀░█░█░</code><br />
  <code>░█▀█░░█░░▄▀▄░</code><br />
  <code>░▀░▀░▀▀▀░▀░▀░</code><br />
  <br />
  <strong>AI eXchange</strong><br />
  <sub>모든 AI 도구를 한 곳에서.</sub>
</p>

<p align="center">
  <a href="https://github.com/ihxnnxs/aix/releases"><img src="https://img.shields.io/github/v/release/ihxnnxs/aix" alt="Release" /></a>
  <a href="https://github.com/ihxnnxs/aix/actions"><img src="https://img.shields.io/github/actions/workflow/status/ihxnnxs/aix/ci.yml" alt="Build" /></a>
  <a href="https://github.com/ihxnnxs/aix/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ihxnnxs/aix" alt="License" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh.md">中文</a> · <a href="README.ja.md">日本語</a>
</p>

---

인터랙티브 TUI를 통해 AI 코딩 도구 간에 MCP 서버 설정을 전송합니다. 글로벌 및 프로젝트 범위 설정을 지원하는 16개 도구를 지원합니다.

## 설치

```bash
npm install -g @ihxnnxs/aix
```

## 사용법

```bash
aix              # 인터랙티브 TUI 실행
aix list         # 모든 도구의 MCP 서버 보기
aix transfer     # 도구 간 MCP 서버 전송
aix doctor       # 도구 감지 진단
```

## 지원 도구

| 도구 | 글로벌 | 프로젝트 |
|------|:------:|:--------:|
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

## 기능

- **전송** — 한 도구에서 MCP 서버를 선택하고 형식을 자동 변환하여 다른 도구로 전송
- **프로젝트 범위** — 프로젝트 디렉토리에서 `aix`를 실행하여 글로벌 및 프로젝트 수준 설정을 관리
- **자동 감지** — 시스템에 설치된 AI 도구를 스캔하고 설정을 읽음
- **백업** — 변경 전 설정을 자동 백업 (`~/.config/aix/backups/`)
- **경고** — 전송 전 호환되지 않는 필드를 표시

## 개발

```bash
bun install
bun run dev          # 개발 모드로 실행
bun test             # 테스트 실행
bun run build        # 크로스 플랫폼 바이너리 빌드
```

## 라이선스

MIT
