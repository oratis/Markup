import type { Strings } from "./en";

export const zh: Strings = {
  // status bar
  "status.saved": "已保存",
  "status.dirty": "有未保存的修改",
  "status.saving": "保存中…",
  "status.error": "错误：{0}",
  "status.words": "{0} 字",
  "status.chars": "{0} 字符",
  "status.lines": "{0} 行",
  "status.mode.wysiwyg": "所见即所得",
  "status.mode.source": "源码",

  // tabs / file tree
  "tabs.untitled": "未命名",
  "tabs.welcome": "欢迎",
  "filetree.empty": "Vault 是空的。",
  "filetree.noVault": "未打开 Vault。⌘⇧O 打开一个。",

  // dialogs
  "settings.title": "设置",
  "settings.fontSize": "字体大小",
  "settings.proseWidth": "正文宽度",
  "settings.autosaveDelay": "自动保存延迟",
  "settings.autosaveDisabled": "已禁用",
  "settings.imageDir": "图片粘贴目录",
  "settings.imageDirHint": "（相对于 Vault 根目录）",
  "settings.locale": "语言",
  "settings.restore": "恢复默认",
  "settings.done": "完成",

  "about.tagline": "面向 macOS 的高性能 Markdown 编辑器",
  "about.version": "版本",
  "about.close": "关闭",

  // command palette / quick open
  "palette.placeholder": "运行命令…",
  "palette.empty": "无匹配命令。",
  "quickOpen.placeholder": "在 Vault 中打开文件…",
  "quickOpen.empty": "无匹配。",
  "search.placeholder": "搜索 Vault…",
  "search.empty": "无结果。",
  "search.busy": "搜索中…",

  // reload prompt
  "reload.message":
    "文件在外部被修改过。重新加载可以看到最新版本（当前未保存的修改将被丢弃）。",
  "reload.button": "重新加载",
  "reload.dismiss": "忽略",

  // toasts
  "toast.copied": "已复制 {0}",
  "toast.copyFailed": "复制失败",
  "toast.wikilinkMiss": "Vault 里没有匹配的文件：{0}",
  "toast.openFailed": "打开 {0} 失败",

  // outline
  "outline.title": "大纲",
  "outline.empty": "没有标题。",

  // find bar
  "find.placeholder": "查找…",
  "find.cmHint": "再按一次 ⌘F — CodeMirror 有自己的搜索面板。",

  // misc
  "tab.confirmClose": "「{0}」有未保存的修改，关闭后会丢失。确认关闭吗？",
};
