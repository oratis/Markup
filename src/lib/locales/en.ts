export const en = {
  // status bar
  "status.saved": "Saved",
  "status.dirty": "Unsaved changes",
  "status.saving": "Saving…",
  "status.error": "Error: {0}",
  "status.words": "{0} words",
  "status.chars": "{0} chars",
  "status.lines": "{0} lines",
  "status.selection": "Selected: {0} words, {1} chars",
  "status.caret": "Ln {0}, Col {1}",
  "status.mode.wysiwyg": "WYSIWYG",
  "status.mode.source": "Source",

  // tabs / file tree
  "tabs.untitled": "Untitled",
  "tabs.welcome": "Welcome",
  "filetree.empty": "Empty vault.",
  "filetree.noVault": "No vault open. Use ⌘⇧O to open one.",

  // dialogs
  "settings.title": "Settings",
  "settings.fontSize": "Font size",
  "settings.proseWidth": "Prose width",
  "settings.autosaveDelay": "Autosave delay",
  "settings.autosaveDisabled": "Disabled",
  "settings.imageDir": "Image paste folder",
  "settings.imageDirHint": "(relative to vault root)",
  "settings.locale": "Language",
  "settings.shortcuts": "Keyboard shortcuts",
  "settings.shortcutsHint":
    "Click a binding to record. Esc to cancel. Native menu items keep their default bindings.",
  "settings.shortcutsRecord": "Press keys…",
  "settings.shortcutsReset": "Reset all",
  "settings.exportTheme": "Export theme",
  "settings.spellcheck": "Spell check",
  "settings.spellcheckHint": "Browser-native",
  "settings.lineWrap": "Line wrap",
  "settings.lineWrapHint": "Source mode",
  "settings.saveOnBlur": "Save on blur",
  "settings.saveOnBlurHint": "Window unfocus",
  "settings.trimOnSave": "Trim trailing whitespace",
  "settings.trimOnSaveHint": "On save",
  "settings.on": "On",
  "settings.off": "Off",
  "settings.restore": "Restore defaults",
  "settings.done": "Done",

  "about.tagline": "High-performance Markdown editor for macOS",
  "about.version": "Version",
  "about.close": "Close",

  // command palette / quick open
  "palette.placeholder": "Run a command…",
  "palette.empty": "No commands.",
  "quickOpen.placeholder": "Open file in vault…",
  "quickOpen.empty": "No matches.",
  "wikilinkPicker.placeholder": "Insert wikilink to file…",
  "cmd.insertWikilink": "Insert Wikilink…",
  "cmd.resetSettings": "Reset All Settings…",
  "settings.confirmReset":
    "Reset all settings (font, layout, shortcuts, language, theme) to defaults?",
  "search.placeholder": "Search vault…",
  "search.empty": "No matches.",
  "search.busy": "Searching…",

  // reload prompt
  "reload.message":
    "File changed on disk since you opened it. Reload to see the latest version (your unsaved edits will be discarded).",
  "reload.button": "Reload",
  "reload.dismiss": "Dismiss",

  // toasts
  "toast.copied": "Copied {0}",
  "toast.copyFailed": "Copy failed",
  "toast.savedAll": "Saved {0} files",
  "toast.saveAllFailed": "Saved {0}, {1} failed",
  "toast.tableSizeBad": "Format: rows x cols (e.g. 3x4)",
  "toast.reloaded": "Reloaded from disk",
  "prompt.tableSize": "Table size as rows x cols (e.g. 3x4):",
  "prompt.linkUrl": "Link URL:",
  "prompt.linkText": "Link text:",
  "reload.confirmDirty":
    '"{0}" has unsaved changes that will be lost on reload. Continue?',
  "toast.wikilinkMiss": 'No vault file matches "{0}"',
  "toast.openFailed": "Failed to open {0}",
  "toast.largeFileSource": "Large file ({0}) — switched to source mode",
  "toast.updateAvailable": "Update {0} available",
  "toast.updateInstalling": "Installing update…",
  "toast.updateRestart": "Update ready — restart to apply",

  // outline
  "outline.title": "Outline",
  "outline.empty": "No headings.",
  "outline.filter": "Filter headings…",
  "outline.noFilterMatch": "No matching headings.",

  // find bar
  "find.placeholder": "Find…",
  "find.cmHint": "Press ⌘F again — CodeMirror has its own search overlay.",

  // misc
  "tab.confirmClose": '"{0}" has unsaved changes that will be lost. Close anyway?',

  // onboarding
  "onboard.title": "Welcome to Markup",
  "onboard.subtitle": "A high-performance Markdown editor for macOS.",
  "onboard.shortcuts": "A few shortcuts to know",
  "onboard.openVault": "Open a Vault",
  "onboard.openFile": "Open a File",
  "onboard.skip": "Skip",
  "onboard.kb.openFile": "Open file",
  "onboard.kb.openVault": "Open vault",
  "onboard.kb.toggleMode": "Toggle source / WYSIWYG",
  "onboard.kb.quickOpen": "Quick open file",
  "onboard.kb.searchVault": "Search vault",
  "onboard.kb.commandPalette": "Command palette",
  "onboard.kb.find": "Find in file",
  "onboard.kb.settings": "Settings",
};

export type Strings = typeof en;
