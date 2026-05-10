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
  "status.selection": "已选：{0} 字 / {1} 字符",
  "status.caret": "行 {0}，列 {1}",
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
  "settings.shortcuts": "键盘快捷键",
  "settings.shortcutsHint": "点击键位开始录制。Esc 取消。原生菜单项会保留默认快捷键。",
  "settings.shortcutsRecord": "请按键…",
  "settings.shortcutsReset": "全部重置",
  "settings.exportTheme": "导出主题",
  "settings.spellcheck": "拼写检查",
  "settings.spellcheckHint": "浏览器原生",
  "settings.lineWrap": "自动换行",
  "settings.lineWrapHint": "源码模式",
  "settings.on": "开启",
  "settings.off": "关闭",
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
  "wikilinkPicker.placeholder": "插入 Wikilink…",
  "cmd.insertWikilink": "插入 Wikilink…",
  "cmd.resetSettings": "重置所有设置…",
  "settings.confirmReset":
    "确认把所有设置（字体、版式、快捷键、语言、主题）重置为默认值吗？",
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
  "toast.savedAll": "已保存 {0} 个文件",
  "toast.saveAllFailed": "已保存 {0}，{1} 个失败",
  "toast.tableSizeBad": "格式：行 x 列（例如 3x4）",
  "toast.reloaded": "已从磁盘重新加载",
  "prompt.tableSize": "表格尺寸：行 x 列（例如 3x4）：",
  "reload.confirmDirty": "「{0}」有未保存的修改，重新加载会丢失。继续吗？",
  "toast.wikilinkMiss": "Vault 里没有匹配的文件：{0}",
  "toast.openFailed": "打开 {0} 失败",
  "toast.largeFileSource": "大文件（{0}）— 已切换到源码模式",
  "toast.updateAvailable": "新版本 {0} 可用",
  "toast.updateInstalling": "安装更新中…",
  "toast.updateRestart": "更新就绪 — 重启以应用",

  // outline
  "outline.title": "大纲",
  "outline.empty": "没有标题。",

  // find bar
  "find.placeholder": "查找…",
  "find.cmHint": "再按一次 ⌘F — CodeMirror 有自己的搜索面板。",

  // misc
  "tab.confirmClose": "「{0}」有未保存的修改，关闭后会丢失。确认关闭吗？",

  // onboarding
  "onboard.title": "欢迎使用 Markup",
  "onboard.subtitle": "面向 macOS 的高性能 Markdown 编辑器。",
  "onboard.shortcuts": "几个常用快捷键",
  "onboard.openVault": "打开 Vault",
  "onboard.openFile": "打开文件",
  "onboard.skip": "跳过",
  "onboard.kb.openFile": "打开文件",
  "onboard.kb.openVault": "打开 Vault",
  "onboard.kb.toggleMode": "切换源码 / WYSIWYG",
  "onboard.kb.quickOpen": "快速打开文件",
  "onboard.kb.searchVault": "搜索 Vault",
  "onboard.kb.commandPalette": "命令面板",
  "onboard.kb.find": "在文件中查找",
  "onboard.kb.settings": "设置",
};
