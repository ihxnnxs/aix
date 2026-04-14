import { createContext, useContext } from "solid-js"
import { createStore } from "solid-js/store"
import { KVStore } from "../config/store"

export interface Strings {
  transfer: string
  list: string
  settings: string
  marketplace: string
  soon: string
  back: string
  quit: string
  navigate: string
  select: string
  open: string
  apply: string
  confirm: string
  switchCli: string
  panel: string
  scope: string
  theme: string
  language: string
  updateAvailable: string
  update: string
  later: string
  allYourAiTools: string
  noServers: string
  notFound: string
  global: string
  project: string
  selected: string
  from: string
  to: string
  doctor: string
}

const LANGS: Record<string, Strings> = {
  en: {
    transfer: "Transfer",
    list: "List",
    settings: "Settings",
    marketplace: "Marketplace",
    soon: "Soon...",
    back: "Back",
    quit: "quit",
    navigate: "navigate",
    select: "select",
    open: "open",
    apply: "apply",
    confirm: "confirm",
    switchCli: "switch CLI",
    panel: "panel",
    scope: "scope",
    theme: "Theme",
    language: "Language",
    updateAvailable: "Update Available",
    update: "Update",
    later: "Later",
    allYourAiTools: "All your AI tools, one place",
    noServers: "no servers",
    notFound: "not found",
    global: "Global",
    project: "Project",
    selected: "selected",
    from: "FROM",
    to: "TO",
    doctor: "Diagnose",
  },
  ru: {
    transfer: "Трансфер",
    list: "Список",
    settings: "Настройки",
    marketplace: "Маркетплейс",
    soon: "Скоро...",
    back: "Назад",
    quit: "выход",
    navigate: "навигация",
    select: "выбор",
    open: "открыть",
    apply: "применить",
    confirm: "подтвердить",
    switchCli: "сменить CLI",
    panel: "панель",
    scope: "скоуп",
    theme: "Тема",
    language: "Язык",
    updateAvailable: "Доступно обновление",
    update: "Обновить",
    later: "Позже",
    allYourAiTools: "Все AI инструменты в одном месте",
    noServers: "нет серверов",
    notFound: "не найден",
    global: "Глобальный",
    project: "Проект",
    selected: "выбрано",
    from: "ИЗ",
    to: "В",
    doctor: "Диагностика",
  },
  zh: {
    transfer: "传输",
    list: "列表",
    settings: "设置",
    marketplace: "市场",
    soon: "即将推出...",
    back: "返回",
    quit: "退出",
    navigate: "导航",
    select: "选择",
    open: "打开",
    apply: "应用",
    confirm: "确认",
    switchCli: "切换 CLI",
    panel: "面板",
    scope: "范围",
    theme: "主题",
    language: "语言",
    updateAvailable: "有可用更新",
    update: "更新",
    later: "稍后",
    allYourAiTools: "所有 AI 工具，尽在一处",
    noServers: "无服务器",
    notFound: "未找到",
    global: "全局",
    project: "项目",
    selected: "已选择",
    from: "来源",
    to: "目标",
    doctor: "诊断",
  },
  ja: {
    transfer: "転送",
    list: "リスト",
    settings: "設定",
    marketplace: "マーケット",
    soon: "近日公開...",
    back: "戻る",
    quit: "終了",
    navigate: "移動",
    select: "選択",
    open: "開く",
    apply: "適用",
    confirm: "確認",
    switchCli: "CLI切替",
    panel: "パネル",
    scope: "スコープ",
    theme: "テーマ",
    language: "言語",
    updateAvailable: "アップデートあり",
    update: "更新",
    later: "後で",
    allYourAiTools: "すべてのAIツールを一箇所に",
    noServers: "サーバーなし",
    notFound: "見つかりません",
    global: "グローバル",
    project: "プロジェクト",
    selected: "選択済み",
    from: "元",
    to: "先",
    doctor: "診断",
  },
  ko: {
    transfer: "전송",
    list: "목록",
    settings: "설정",
    marketplace: "마켓플레이스",
    soon: "곧 출시...",
    back: "뒤로",
    quit: "종료",
    navigate: "이동",
    select: "선택",
    open: "열기",
    apply: "적용",
    confirm: "확인",
    switchCli: "CLI 전환",
    panel: "패널",
    scope: "범위",
    theme: "테마",
    language: "언어",
    updateAvailable: "업데이트 가능",
    update: "업데이트",
    later: "나중에",
    allYourAiTools: "모든 AI 도구를 한 곳에서",
    noServers: "서버 없음",
    notFound: "찾을 수 없음",
    global: "글로벌",
    project: "프로젝트",
    selected: "선택됨",
    from: "원본",
    to: "대상",
    doctor: "진단",
  },
}

export function getStrings(langId?: string): Strings {
  const store = new KVStore()
  const id = langId ?? store.get<string>("language") ?? "en"
  return LANGS[id] ?? LANGS.en
}

export function getAllLanguages() {
  return Object.entries(LANGS).map(([id, strings]) => ({
    id,
    name: id === "en" ? "English" : id === "ru" ? "Русский" : id === "zh" ? "中文" : id === "ja" ? "日本語" : "한국어",
  }))
}
