export const en = {
  // status bar
  "status.saved": "Saved",
  "status.dirty": "Unsaved changes",
  "status.saving": "Saving…",
  "status.error": "Error: {0}",
  "status.words": "{0} words",
  "status.chars": "{0} chars",
  "status.lines": "{0} lines",
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
  "toast.wikilinkMiss": 'No vault file matches "{0}"',
  "toast.openFailed": "Failed to open {0}",

  // outline
  "outline.title": "Outline",
  "outline.empty": "No headings.",

  // find bar
  "find.placeholder": "Find…",
  "find.cmHint": "Press ⌘F again — CodeMirror has its own search overlay.",

  // misc
  "tab.confirmClose": '"{0}" has unsaved changes that will be lost. Close anyway?',
};

export type Strings = typeof en;
