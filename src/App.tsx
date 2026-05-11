import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AboutDialog } from "./components/AboutDialog";
import { type Command, CommandPalette } from "./components/CommandPalette";
import { MarkupEditor } from "./components/Editor";
import { FileTree } from "./components/FileTree";
import { FindBar } from "./components/FindBar";
import { Onboarding } from "./components/Onboarding";
import { Outline } from "./components/Outline";
import { QuickOpen } from "./components/QuickOpen";
import { ReloadPrompt } from "./components/ReloadPrompt";
import { Resizer } from "./components/Resizer";
import { SearchPanel } from "./components/SearchPanel";
import { SettingsDialog } from "./components/SettingsDialog";
import { ShortcutsCheatsheet } from "./components/ShortcutsCheatsheet";
import { StatusBar } from "./components/StatusBar";
import { TabBar } from "./components/TabBar";
import { ToastHost, showToast } from "./components/Toast";
import { Toolbar } from "./components/Toolbar";
import { WikilinkPicker } from "./components/WikilinkPicker";
import { getActiveSourceView } from "./lib/active-source-view";
import {
  cycleHeadingLevel,
  dedupLines,
  duplicateLine,
  moveLineDown,
  moveLineUp,
  reverseLines,
  setHeadingLevel,
  sortLines,
  toggleBlockquote,
  toggleList,
} from "./lib/cm-line-ops";
import {
  moveSectionDown,
  moveSectionToBottom,
  moveSectionToTop,
  moveSectionUp,
} from "./lib/cm-section";
import { formatTable, toggleTaskCheckboxOnLine } from "./lib/cm-table-format";
import { exportHtml, exportPdfViaPrint } from "./lib/export";
import { installFocusTypewriter } from "./lib/focus-typewriter";
import { wikilinkAtCursor } from "./lib/follow-wikilink";
import {
  jumpToSourceLine,
  nextHeadingFrom,
  parseHeadings,
  prevHeadingFrom,
} from "./lib/headings";
import { useT } from "./lib/i18n";
import { installImageDrop } from "./lib/image-drop";
import { installImagePaste } from "./lib/image-paste";
import {
  buildTableMarkdown,
  insertMarkdown,
  toTitleCase,
  transformSelection,
  wrapMarkdown,
} from "./lib/insert-md";
import { buildParagraphLink } from "./lib/paragraph-link";
import { getPinnedPaths, persistPinnedPath } from "./lib/pinned-paths";
import { trimTrailingWhitespace } from "./lib/save-prep";
import { getScroll, setScroll } from "./lib/scroll-memory";
import { readSession, writeSession } from "./lib/session";
import { serializeSettings } from "./lib/settings-io";
import { resetAll as resetAllShortcuts } from "./lib/shortcuts";
import { matches as matchesShortcut } from "./lib/shortcuts";
import { firstHeadingText, slugifyForFilename } from "./lib/slugify";
import { installSmartPaste } from "./lib/smart-paste";
import { stripMarkdown } from "./lib/strip-md";
import { nextTheme, resolveTheme, subscribeSystemTheme } from "./lib/system-theme";
import {
  listRecentFilesNative,
  listVaultFiles,
  listenMenu,
  listenVaultChanged,
  openFileDialog,
  openNewWindow,
  openVault,
  pickSavePath,
  pickVault,
  pushRecentFileNative,
  readFile,
  renameFile,
  renderHtml,
  writeFile,
} from "./lib/tauri";
import { checkForUpdates } from "./lib/updater";
import { findVaultFile, wikilinkAtClick } from "./lib/wikilink";
import { type Theme, getActiveTab, useAppStore } from "./store";

const THEME_KEY = "markup.theme";
const SOURCE_MODE_KEY = "markup.sourceMode";
const SIDEBAR_KEY = "markup.sidebar";
const OUTLINE_KEY = "markup.outline";
const FOCUS_KEY = "markup.focus";
const TYPEWRITER_KEY = "markup.typewriter";
const RECENT_KEY = "markup.recentFiles";
const RECENT_VAULTS_KEY = "markup.recentVaults";
const SETTINGS_KEY = "markup.settings";

function applyThemeToHtml(theme: Theme) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  root.classList.remove("theme-light", "theme-dark", "theme-sepia");
  root.classList.add(`theme-${resolved}`);
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function applyClass(htmlClass: string, on: boolean) {
  document.documentElement.classList.toggle(htmlClass, on);
}

export function App() {
  const tr = useT();
  const tab = useAppStore(getActiveTab);
  const tabs = useAppStore((s) => s.tabs);
  const sourceMode = useAppStore((s) => s.sourceMode);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const outlineOpen = useAppStore((s) => s.outlineOpen);
  const focusMode = useAppStore((s) => s.focusMode);
  const typewriterMode = useAppStore((s) => s.typewriterMode);
  const theme = useAppStore((s) => s.theme);
  const recentFiles = useAppStore((s) => s.recentFiles);

  const updateActiveContent = useAppStore((s) => s.updateActiveContent);
  const setActiveStatus = useAppStore((s) => s.setActiveStatus);
  const setActiveMtime = useAppStore((s) => s.setActiveMtime);
  const setVault = useAppStore((s) => s.setVault);
  const setVaultFiles = useAppStore((s) => s.setVaultFiles);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);
  const closeTab = useAppStore((s) => s.closeTab);
  const newScratchTab = useAppStore((s) => s.newScratchTab);
  const setSourceMode = useAppStore((s) => s.setSourceMode);
  const toggleSourceMode = useAppStore((s) => s.toggleSourceMode);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleOutline = useAppStore((s) => s.toggleOutline);
  const toggleFocusMode = useAppStore((s) => s.toggleFocusMode);
  const toggleTypewriterMode = useAppStore((s) => s.toggleTypewriterMode);
  const setTheme = useAppStore((s) => s.setTheme);
  const pushRecentFile = useAppStore((s) => s.pushRecentFile);
  const setRecentFiles = useAppStore((s) => s.setRecentFiles);
  const setRecentVaults = useAppStore((s) => s.setRecentVaults);
  const recentVaults = useAppStore((s) => s.recentVaults);

  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState("");
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showRecentOpen, setShowRecentOpen] = useState(false);
  const [showFindBar, setShowFindBar] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWikilinkPicker, setShowWikilinkPicker] = useState(false);
  const [wikilinkPickerMode, setWikilinkPickerMode] = useState<"full" | "completion">(
    "full",
  );

  const fontSize = useAppStore((s) => s.fontSize);
  const proseMaxWidth = useAppStore((s) => s.proseMaxWidth);
  const autosaveMs = useAppStore((s) => s.autosaveMs);
  const setSettings = useAppStore((s) => s.setSettings);
  const [reloadPromptDismissed, setReloadPromptDismissed] = useState<string | null>(null);
  const [externalMtime, setExternalMtime] = useState<number | null>(null);

  const editorScrollRef = useRef<HTMLElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  // Restore prefs on mount
  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY) as Theme | null;
      if (t === "light" || t === "dark" || t === "sepia" || t === "auto") setTheme(t);
      if (localStorage.getItem(SOURCE_MODE_KEY) === "true") setSourceMode(true);
      if (localStorage.getItem(SIDEBAR_KEY) === "true") toggleSidebar();
      if (localStorage.getItem(OUTLINE_KEY) === "true") toggleOutline();
      if (localStorage.getItem(FOCUS_KEY) === "true") toggleFocusMode();
      if (localStorage.getItem(TYPEWRITER_KEY) === "true") toggleTypewriterMode();
      const recent = localStorage.getItem(RECENT_KEY);
      if (recent) {
        try {
          const arr = JSON.parse(recent);
          if (Array.isArray(arr))
            setRecentFiles(arr.filter((x) => typeof x === "string"));
        } catch {
          /*ignore*/
        }
      }
      const recentV = localStorage.getItem(RECENT_VAULTS_KEY);
      if (recentV) {
        try {
          const arr = JSON.parse(recentV);
          if (Array.isArray(arr))
            setRecentVaults(arr.filter((x) => typeof x === "string"));
        } catch {
          /*ignore*/
        }
      }
      // Disk-backed list takes precedence (cross-window source of truth).
      listRecentFilesNative()
        .then((arr) => {
          if (Array.isArray(arr) && arr.length > 0) setRecentFiles(arr);
        })
        .catch(() => {});
      const settingsRaw = localStorage.getItem(SETTINGS_KEY);
      if (settingsRaw) {
        try {
          const s = JSON.parse(settingsRaw);
          if (s && typeof s === "object") setSettings(s);
        } catch {
          /*ignore*/
        }
      }
      // First-launch onboarding
      if (!localStorage.getItem("markup.onboarded")) {
        setShowOnboarding(true);
      }
    } catch {
      /*ignore*/
    }
    // Auto-updater check (silent on failure; requires updater.active=true
    // + pubkey configured to actually upgrade — see lib/updater.ts).
    checkForUpdates();
    // Restore previously-open tabs. Runs async — failures are silent
    // (file may have been deleted / moved since the last session).
    const sess = readSession();
    if (sess.open.length > 0) {
      Promise.all(sess.open.map((p) => readFile(p).catch(() => null))).then((all) => {
        let restored = 0;
        for (const loaded of all) {
          if (loaded) {
            openLoadedFile(loaded);
            restored += 1;
          }
        }
        if (sess.active) {
          useAppStore.getState().setActiveTab(sess.active);
        }
        if (restored > 0) {
          showToast(tr("toast.sessionRestored", restored));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismissOnboarding() {
    try {
      localStorage.setItem("markup.onboarded", "true");
    } catch {
      /*ignore*/
    }
    setShowOnboarding(false);
  }

  // Persist + apply theme; if theme is "auto", subscribe to system changes
  // so flipping macOS Light/Dark Mode updates the editor live.
  useEffect(() => {
    applyThemeToHtml(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /*ignore*/
    }
    return subscribeSystemTheme(theme, () => applyThemeToHtml(theme));
  }, [theme]);
  useEffect(() => {
    try {
      localStorage.setItem(SOURCE_MODE_KEY, String(sourceMode));
    } catch {
      /*ignore*/
    }
  }, [sourceMode]);
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen));
    } catch {
      /*ignore*/
    }
  }, [sidebarOpen]);
  useEffect(() => {
    try {
      localStorage.setItem(OUTLINE_KEY, String(outlineOpen));
    } catch {
      /*ignore*/
    }
  }, [outlineOpen]);
  useEffect(() => {
    applyClass("focus-mode", focusMode);
    try {
      localStorage.setItem(FOCUS_KEY, String(focusMode));
    } catch {
      /*ignore*/
    }
  }, [focusMode]);
  useEffect(() => {
    applyClass("typewriter-mode", typewriterMode);
    try {
      localStorage.setItem(TYPEWRITER_KEY, String(typewriterMode));
    } catch {
      /*ignore*/
    }
  }, [typewriterMode]);
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recentFiles));
      localStorage.setItem(RECENT_VAULTS_KEY, JSON.stringify(recentVaults));
    } catch {
      /*ignore*/
    }
  }, [recentFiles, recentVaults]);

  // Settings → CSS variables + persist
  const exportTheme = useAppStore((s) => s.exportTheme);
  const imagePasteDir = useAppStore((s) => s.imagePasteDir);
  const spellcheck = useAppStore((s) => s.spellcheck);
  const lineWrap = useAppStore((s) => s.lineWrap);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const outlineWidth = useAppStore((s) => s.outlineWidth);
  const saveOnBlur = useAppStore((s) => s.saveOnBlur);
  const trimOnSave = useAppStore((s) => s.trimOnSave);
  const showLineNumbers = useAppStore((s) => s.showLineNumbers);
  const wordCountGoal = useAppStore((s) => s.wordCountGoal);
  const showToolbar = useAppStore((s) => s.showToolbar);
  const showTabBar = useAppStore((s) => s.showTabBar);
  const vaultSort = useAppStore((s) => s.vaultSort);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--markup-font-size", `${fontSize}px`);
    root.style.setProperty("--markup-prose-max-width", `${proseMaxWidth}px`);
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          fontSize,
          proseMaxWidth,
          autosaveMs,
          imagePasteDir,
          exportTheme,
          spellcheck,
          lineWrap,
          sidebarWidth,
          outlineWidth,
          saveOnBlur,
          trimOnSave,
          showLineNumbers,
          wordCountGoal,
          showToolbar,
          showTabBar,
          vaultSort,
        }),
      );
    } catch {
      /*ignore*/
    }
  }, [
    fontSize,
    proseMaxWidth,
    autosaveMs,
    imagePasteDir,
    exportTheme,
    spellcheck,
    lineWrap,
    sidebarWidth,
    outlineWidth,
    saveOnBlur,
    trimOnSave,
    showLineNumbers,
    wordCountGoal,
    showToolbar,
    showTabBar,
    vaultSort,
  ]);

  // Push recent file when active tab changes to a real file. Mirror to
  // the Rust-side store so other windows + next launches see it without
  // waiting for localStorage hydration.
  useEffect(() => {
    if (tab?.path) {
      pushRecentFile(tab.path);
      pushRecentFileNative(tab.path).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.path]);

  // Big-file safety net: > 5 MB → switch to source mode (CodeMirror handles
  // huge documents via virtualisation; Milkdown is fine with big text but
  // its initial parse + render can stall the main thread).
  useEffect(() => {
    if (!tab) return;
    const size = tab.content.length;
    const LIMIT = 5 * 1024 * 1024;
    if (size > LIMIT && !sourceMode) {
      setSourceMode(true);
      const mb = (size / (1024 * 1024)).toFixed(1);
      showToast(tr("toast.largeFileSource", `${mb} MB`));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.id]);

  // Focus + Typewriter installer
  useEffect(() => {
    const dispose = installFocusTypewriter({
      scrollContainer: () => editorScrollRef.current,
      enabled: () => ({ focus: focusMode, typewriter: typewriterMode }),
    });
    return dispose;
  }, [focusMode, typewriterMode]);

  // Pinned-tab persistence. When a path-backed tab opens whose path is
  // in the persisted set, mark it pinned. We also subscribe to tabs
  // changes so toggling a pin (which only mutates the in-memory flag)
  // gets mirrored back into the persisted set.
  useEffect(() => {
    const persisted = getPinnedPaths();
    if (persisted.size === 0) return;
    // Apply to current tabs once on mount.
    useAppStore.setState((s) => ({
      tabs: s.tabs.map((t) =>
        !t.pinned && t.path && persisted.has(t.path) ? { ...t, pinned: true } : t,
      ),
    }));
  }, []);

  useEffect(() => {
    // Mirror current pinned state back to the persisted set whenever
    // the tabs change. Only path-backed tabs participate.
    const known = getPinnedPaths();
    const wantPinned = new Set(
      tabs.filter((t) => t.pinned && t.path).map((t) => t.path as string),
    );
    // Persist diffs only.
    for (const t of tabs) {
      if (!t.path) continue;
      const isPinned = wantPinned.has(t.path);
      const wasPinned = known.has(t.path);
      if (isPinned !== wasPinned) persistPinnedPath(t.path, isPinned);
    }
  }, [tabs]);

  // Persist the open-tab session — list of path-backed tabs + the
  // currently active path. Restored on next launch.
  useEffect(() => {
    const open = tabs.map((t) => t.path).filter((p): p is string => Boolean(p));
    const active = tab?.path ?? null;
    writeSession({ open, active });
  }, [tabs, tab?.path]);

  // Per-tab WYSIWYG scroll memory: capture on scroll, restore on tab
  // switch. Source mode owns its own scroll element via SourceEditor.
  useEffect(() => {
    const host = editorScrollRef.current;
    if (!host || !tab || sourceMode) return;
    // Restore after first paint so layout is established. rAF is fine —
    // Milkdown mounts synchronously by the time we get here.
    const id = tab.id;
    const raf = window.requestAnimationFrame(() => {
      host.scrollTop = getScroll(id);
    });
    const onScroll = () => setScroll(id, host.scrollTop);
    host.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      host.removeEventListener("scroll", onScroll);
    };
  }, [tab?.id, sourceMode]);

  // Cmd+click on a `[[wikilink]]` in source mode — SourceEditor dispatches
  // a window event with the click position; resolve + open the file.
  useEffect(() => {
    const onFollow = async (e: Event) => {
      const detail = (e as CustomEvent<{ pos: number }>).detail;
      const name = wikilinkAtCursor(detail?.pos);
      if (!name) return;
      const target = findVaultFile(useAppStore.getState().vaultFiles, name);
      if (!target) {
        showToast(tr("toast.wikilinkMiss", name));
        return;
      }
      try {
        const loaded = await readFile(target.path);
        openLoadedFile(loaded);
      } catch (err) {
        console.error("follow_wikilink_at_pos failed", err);
        showToast(tr("toast.openFailed", target.path));
      }
    };
    window.addEventListener("markup:follow-wikilink-at-pos", onFollow);
    return () => window.removeEventListener("markup:follow-wikilink-at-pos", onFollow);
  }, [openLoadedFile, tr]);

  // Source-mode `[[` trigger: SourceEditor's CM6 input handler dispatches
  // markup:wikilink-trigger; we open the picker in completion mode here.
  useEffect(() => {
    const onTrigger = () => {
      if (showWikilinkPicker) return;
      setWikilinkPickerMode("completion");
      setShowWikilinkPicker(true);
    };
    window.addEventListener("markup:wikilink-trigger", onTrigger);
    return () => window.removeEventListener("markup:wikilink-trigger", onTrigger);
  }, [showWikilinkPicker]);

  // Auto-trigger the wikilink picker when the user types `[[`. Only fires in
  // WYSIWYG (Milkdown / contenteditable) — source mode handles its own
  // detection via the CM6 input handler above.
  useEffect(() => {
    if (sourceMode) return;
    const host = editorScrollRef.current;
    if (!host) return;
    const onInput = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;
      const offset = range.startOffset;
      const text = node.textContent ?? "";

      // Picker only opens in "completion" mode; close it again if the
      // user backspaced through the `[[`.
      if (
        showWikilinkPicker &&
        wikilinkPickerMode === "completion" &&
        (offset < 2 || text.slice(offset - 2, offset) !== "[[")
      ) {
        setShowWikilinkPicker(false);
        setWikilinkPickerMode("full");
        return;
      }

      if (offset < 2) return;
      if (text.slice(offset - 2, offset) === "[[") {
        if (showWikilinkPicker) return; // don't double-open
        setWikilinkPickerMode("completion");
        setShowWikilinkPicker(true);
      }
    };
    host.addEventListener("input", onInput);
    return () => host.removeEventListener("input", onInput);
  }, [sourceMode, showWikilinkPicker, wikilinkPickerMode]);

  // Wikilink click handler — works in both Milkdown WYSIWYG and CM6 source mode.
  // Detects a click landing inside `[[name]]` text and opens the matching
  // vault file.
  useEffect(() => {
    const host = editorScrollRef.current;
    if (!host) return;
    const onClick = async (e: MouseEvent) => {
      // For source mode CM6 also fires click; same DOM-text logic applies.
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const name = wikilinkAtClick(range.startContainer, range.startOffset);
      if (!name) return;
      e.preventDefault();
      e.stopPropagation();
      const files = useAppStore.getState().vaultFiles;
      const target = findVaultFile(files, name);
      if (!target) {
        showToast(tr("toast.wikilinkMiss", name));
        return;
      }
      try {
        const loaded = await readFile(target.path);
        openLoadedFile(loaded);
      } catch (err) {
        console.error("readFile failed", err);
        showToast(tr("toast.openFailed", target.name));
      }
    };
    host.addEventListener("click", onClick);
    return () => host.removeEventListener("click", onClick);
  }, [openLoadedFile]);

  function copyParagraphLink() {
    const sel = window.getSelection();
    let cursorLine = 0;
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // Heuristic: get line index by counting newlines in the editor content
      // up to a position derived from the clicked block's position. For
      // source mode this is precise via CM6; for WYSIWYG we approximate via
      // the active block element's preceding text.
      const block = (range.startContainer as Element).closest?.(
        "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre",
      );
      const t = useAppStore.getState();
      const active = t.activeTabId ? t.tabs.find((x) => x.id === t.activeTabId) : null;
      const text = active?.content ?? "";
      const blockText = block?.textContent ?? "";
      const idx = blockText ? text.indexOf(blockText) : -1;
      if (idx >= 0) {
        cursorLine = text.slice(0, idx).split("\n").length - 1;
      }
    }
    const t = useAppStore.getState();
    const active = t.activeTabId ? t.tabs.find((x) => x.id === t.activeTabId) : null;
    const link = buildParagraphLink(
      active?.path ?? null,
      active?.content ?? "",
      cursorLine,
    );
    navigator.clipboard.writeText(link).then(
      () => showToast(tr("toast.copied", link)),
      () => showToast(tr("toast.copyFailed")),
    );
  }

  // Image paste / drop in WYSIWYG (Milkdown / contenteditable). Source-mode
  // paste + drop are installed inside SourceEditor where the CM6 view is
  // reachable for direct dispatch.
  useEffect(() => {
    if (sourceMode) return;
    const host = editorScrollRef.current;
    if (!host) return;
    const insertAtSelection = (md: string) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(md));
      sel.collapseToEnd();
    };
    const opts = {
      vaultRoot: useAppStore.getState().vaultRoot,
      imageDir: useAppStore.getState().imagePasteDir,
      insert: insertAtSelection,
    };
    const detachPaste = installImagePaste(host, opts);
    const detachSmart = installSmartPaste(host, {
      getSelectionText: () => window.getSelection()?.toString() ?? "",
      insertLink: (md) => {
        insertAtSelection(md);
        return true;
      },
    });
    const detachDrop = installImageDrop(host, {
      ...opts,
      onMarkdownDrop: async (file) => {
        // Tauri 2 exposes `path` on the dropped File via the FileSystemFileHandle
        // polyfill; fall back to reading content directly when path is empty.
        // biome-ignore lint/suspicious/noExplicitAny: Tauri-specific extension
        const tauriPath: string | undefined = (file as any).path;
        try {
          if (tauriPath) {
            const loaded = await readFile(tauriPath);
            openLoadedFile(loaded);
          } else {
            const content = await file.text();
            openLoadedFile({
              path: file.name,
              content,
              mtime_ms: Date.now(),
            });
          }
        } catch (err) {
          console.error("drop-open failed", err);
        }
      },
    });
    return () => {
      detachPaste();
      detachSmart();
      detachDrop();
    };
  }, [tab?.id, sourceMode]);

  const performSave = useCallback(async () => {
    const state = useAppStore.getState();
    const t = state.activeTabId
      ? state.tabs.find((x) => x.id === state.activeTabId)
      : null;
    if (!t || !t.path) return;
    setActiveStatus("saving");
    try {
      const content = state.trimOnSave ? trimTrailingWhitespace(t.content) : t.content;
      const newMtime = await writeFile(t.path, content, t.mtimeMs);
      if (state.trimOnSave && content !== t.content) {
        // Push the trimmed content back into the store so the editor reflects
        // the on-disk version; SourceEditor's reconcile effect picks it up.
        useAppStore.setState((s) => ({
          tabs: s.tabs.map((tx) => (tx.id === t.id ? { ...tx, content } : tx)),
        }));
      }
      setActiveMtime(newMtime);
      setActiveStatus("saved");
      // Remember mtime so vault-changed events from our own save don't trigger reload prompt
      setExternalMtime(null);
    } catch (err) {
      console.error("write_file failed", err);
      setActiveStatus("error", String(err));
    }
  }, [setActiveStatus, setActiveMtime]);

  const saveAllSilent = useCallback(async () => {
    const state = useAppStore.getState();
    const dirty = state.tabs.filter((tx) => tx.path && tx.status === "dirty");
    if (dirty.length === 0) return;
    const trim = state.trimOnSave;
    const payloads = dirty.map((tx) =>
      trim ? trimTrailingWhitespace(tx.content) : tx.content,
    );
    const results = await Promise.allSettled(
      dirty.map((tx, i) => writeFile(String(tx.path), payloads[i], tx.mtimeMs)),
    );
    useAppStore.setState((s) => ({
      tabs: s.tabs.map((tx) => {
        const i = dirty.findIndex((d) => d.id === tx.id);
        if (i < 0) return tx;
        const r = results[i];
        if (r.status === "fulfilled") {
          return {
            ...tx,
            content: trim ? payloads[i] : tx.content,
            status: "saved",
            mtimeMs: r.value,
            errorMessage: null,
          };
        }
        return { ...tx, status: "error", errorMessage: String(r.reason) };
      }),
    }));
    setExternalMtime(null);
  }, []);

  // beforeunload guard: warn the user before closing the window when any
  // path-backed tab is dirty. Tauri's main window respects the standard
  // beforeunload prompt; in regular browser dev mode it shows the native
  // "Leave site? Changes you made may not be saved." dialog.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const dirty = useAppStore
        .getState()
        .tabs.some((tx) => tx.path && tx.status === "dirty");
      if (!dirty) return;
      e.preventDefault();
      // Some browsers gate the prompt on a non-empty returnValue.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Save All silently when the window loses focus, if the user opted in.
  // This is a safety net: avoids losing work to crashes / power loss while
  // the editor is in a background tab. Errors are swallowed (the per-tab
  // status flips to "error" via saveAllSilent's per-tab patching).
  useEffect(() => {
    if (!saveOnBlur) return;
    const onBlur = () => {
      saveAllSilent();
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [saveOnBlur, saveAllSilent]);

  const saveAll = useCallback(async () => {
    const state = useAppStore.getState();
    const dirty = state.tabs.filter((tx) => tx.path && tx.status === "dirty");
    if (dirty.length === 0) return;
    const trim = state.trimOnSave;
    const payloads = dirty.map((tx) =>
      trim ? trimTrailingWhitespace(tx.content) : tx.content,
    );
    const results = await Promise.allSettled(
      dirty.map((tx, i) => writeFile(String(tx.path), payloads[i], tx.mtimeMs)),
    );
    let savedCount = 0;
    let failedCount = 0;
    useAppStore.setState((s) => ({
      tabs: s.tabs.map((tx) => {
        const i = dirty.findIndex((d) => d.id === tx.id);
        if (i < 0) return tx;
        const r = results[i];
        if (r.status === "fulfilled") {
          savedCount += 1;
          return {
            ...tx,
            content: trim ? payloads[i] : tx.content,
            status: "saved",
            mtimeMs: r.value,
            errorMessage: null,
          };
        }
        failedCount += 1;
        return {
          ...tx,
          status: "error",
          errorMessage: String(r.reason),
        };
      }),
    }));
    setExternalMtime(null);
    if (failedCount === 0) {
      showToast(tr("toast.savedAll", savedCount));
    } else {
      showToast(tr("toast.saveAllFailed", savedCount, failedCount));
    }
  }, [tr]);

  const handleEditorChange = useCallback(
    (md: string) => {
      updateActiveContent(md);
      const state = useAppStore.getState();
      const active = state.activeTabId
        ? state.tabs.find((x) => x.id === state.activeTabId)
        : null;
      if (!active?.path) return;
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      const delay = useAppStore.getState().autosaveMs;
      if (delay <= 0) return; // autosave disabled — only ⌘S saves
      saveTimerRef.current = window.setTimeout(performSave, delay);
    },
    [updateActiveContent, performSave],
  );

  const handleOpenFile = useCallback(async () => {
    try {
      const loaded = await openFileDialog();
      if (loaded) openLoadedFile(loaded);
    } catch (e) {
      console.error("open_file failed", e);
    }
  }, [openLoadedFile]);

  const jumpToHeading = useCallback((direction: "next" | "prev") => {
    const t2 = getActiveTab(useAppStore.getState());
    if (!t2) return;
    const headings = parseHeadings(t2.content);
    if (headings.length === 0) return;
    let cursorLine = 0;
    const view = getActiveSourceView();
    if (view) {
      cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
    } else {
      // WYSIWYG — approximate by scanning the DOM Selection's enclosing
      // block back to a position in the markdown source. Falls back to 0
      // when nothing is selected, which lands on the first heading.
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const block = (sel.getRangeAt(0).startContainer as Element).closest?.(
          "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre",
        );
        const blockText = block?.textContent ?? "";
        const idx = blockText ? t2.content.indexOf(blockText) : -1;
        if (idx >= 0) cursorLine = t2.content.slice(0, idx).split("\n").length - 1;
      }
    }
    const target =
      direction === "next"
        ? nextHeadingFrom(headings, cursorLine)
        : prevHeadingFrom(headings, cursorLine);
    if (!target) return;
    if (jumpToSourceLine(target.line)) return;
    // WYSIWYG fallback: scroll the rendered heading into view.
    const tag = `H${target.level}`;
    for (const node of Array.from(document.querySelectorAll(`.milkdown ${tag}`))) {
      if ((node.textContent ?? "").trim() === target.text) {
        (node as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
  }, []);

  const newFileInVault = useCallback(async () => {
    const root = useAppStore.getState().vaultRoot;
    if (!root) {
      showToast(tr("toast.newFileNoVault"));
      return;
    }
    const name = window.prompt(tr("prompt.newFileName"), "untitled.md");
    if (!name) return;
    const cleanName = name.trim();
    if (!cleanName || cleanName.includes("/")) {
      showToast(tr("toast.renameBadName"));
      return;
    }
    const finalName = cleanName.toLowerCase().endsWith(".md")
      ? cleanName
      : `${cleanName}.md`;
    const sep = root.endsWith("/") ? "" : "/";
    const newPath = `${root}${sep}${finalName}`;
    try {
      const mtime = await writeFile(newPath, "", null);
      openLoadedFile({ path: newPath, content: "", mtime_ms: mtime });
      // Refresh the vault file list so the sidebar picks up the newcomer.
      try {
        const files = await listVaultFiles();
        useAppStore.getState().setVaultFiles(files.map(toVaultFileTs));
      } catch {
        /*ignore — watcher will pick it up too*/
      }
    } catch (e) {
      console.error("new_file_in_vault failed", e);
      showToast(tr("toast.newFileFailed", String(e)));
    }
  }, [openLoadedFile, tr]);

  const renameActiveFile = useCallback(async () => {
    const t2 = getActiveTab(useAppStore.getState());
    if (!t2?.path) {
      showToast(tr("toast.renameNoFile"));
      return;
    }
    const lastSlash = t2.path.lastIndexOf("/");
    const dir = lastSlash >= 0 ? t2.path.slice(0, lastSlash + 1) : "";
    const oldName = t2.name;
    const newName = window.prompt(tr("prompt.rename"), oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;
    const cleanName = newName.trim();
    if (cleanName.includes("/")) {
      showToast(tr("toast.renameBadName"));
      return;
    }
    const newPath = dir + cleanName;
    try {
      await renameFile(t2.path, newPath);
      // Re-open the renamed file: the watcher will refresh the tree, but
      // the current tab keeps the old (now-stale) path. Swap it in place.
      const s = useAppStore.getState();
      s.setActivePathAndName(newPath, cleanName, t2.mtimeMs ?? Date.now());
    } catch (e) {
      console.error("rename_active failed", e);
      showToast(tr("toast.renameFailed"));
    }
  }, [tr]);

  const promptInsertLink = useCallback(() => {
    const url = window.prompt(tr("prompt.linkUrl"), "https://");
    if (!url) return;
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    // If there's a selection, use it as the link text; otherwise prompt
    // for a label so we never insert an empty `[]()` link.
    const selText =
      window.getSelection()?.toString() ||
      getActiveSourceView()?.state.sliceDoc(
        getActiveSourceView()?.state.selection.main.from ?? 0,
        getActiveSourceView()?.state.selection.main.to ?? 0,
      ) ||
      "";
    if (selText) {
      // Replace the selection with [selText](url)
      transformSelection(() => `[${selText}](${cleanUrl})`);
      return;
    }
    const text = window.prompt(tr("prompt.linkText"), cleanUrl) ?? cleanUrl;
    insertMarkdown(`[${text}](${cleanUrl})`);
  }, [tr]);

  const reloadFromDisk = useCallback(async () => {
    const state = useAppStore.getState();
    const cur = state.activeTabId
      ? state.tabs.find((x) => x.id === state.activeTabId)
      : null;
    if (!cur?.path) return;
    if (cur.status === "dirty") {
      const ok = window.confirm(tr("reload.confirmDirty", cur.name));
      if (!ok) return;
    }
    try {
      const loaded = await readFile(cur.path);
      state.reloadActiveFromDisk(loaded.content, loaded.mtime_ms);
      setExternalMtime(null);
      showToast(tr("toast.reloaded"));
    } catch (e) {
      console.error("reload_from_disk failed", e);
      showToast(tr("toast.openFailed", cur.path));
    }
  }, [tr]);

  const reopenLastClosed = useCallback(async () => {
    const path = useAppStore.getState().popRecentlyClosed();
    if (!path) return;
    try {
      const loaded = await readFile(path);
      openLoadedFile(loaded);
    } catch (e) {
      console.error("reopen_closed failed", e);
      showToast(tr("toast.openFailed", path));
    }
  }, [openLoadedFile, tr]);

  const openRecent = useCallback(
    async (path: string) => {
      try {
        const loaded = await readFile(path);
        openLoadedFile(loaded);
      } catch (e) {
        console.error("open_recent failed", e);
        showToast(tr("toast.openFailed", path));
      }
    },
    [openLoadedFile, tr],
  );

  const handleOpenVault = useCallback(async () => {
    try {
      const root = await pickVault();
      if (!root) return;
      const opened = await openVault(root);
      const files = await listVaultFiles();
      setVault(opened.root, files.map(toVaultFileTs));
      useAppStore.getState().pushRecentVault(opened.root);
    } catch (e) {
      console.error("open_vault failed", e);
    }
  }, [setVault]);

  const openRecentVault = useCallback(
    async (root: string) => {
      try {
        const opened = await openVault(root);
        const files = await listVaultFiles();
        setVault(opened.root, files.map(toVaultFileTs));
        useAppStore.getState().pushRecentVault(opened.root);
      } catch (e) {
        console.error("open_recent_vault failed", e);
        showToast(tr("toast.openFailed", root));
      }
    },
    [setVault, tr],
  );

  const refreshVault = useCallback(async () => {
    try {
      const files = await listVaultFiles();
      setVaultFiles(files.map(toVaultFileTs));
      // Also re-check the active file's on-disk mtime
      const state = useAppStore.getState();
      const t = state.activeTabId
        ? state.tabs.find((x) => x.id === state.activeTabId)
        : null;
      if (t?.path && t.mtimeMs) {
        const match = files.find((f) => f.path === t.path);
        if (match && match.mtime_ms > t.mtimeMs + 500) {
          setExternalMtime(match.mtime_ms);
        }
      }
    } catch {
      /*ignore*/
    }
  }, [setVaultFiles]);

  // Menu + vault listeners
  useEffect(() => {
    let unMenu: (() => void) | null = null;
    let unVault: (() => void) | null = null;
    listenMenu((id) => {
      switch (id) {
        case "new_file":
          newScratchTab();
          break;
        case "new_window":
          openNewWindow().catch((e) => console.error("new_window failed", e));
          break;
        case "open_file":
          handleOpenFile();
          break;
        case "open_vault":
          handleOpenVault();
          break;
        case "open_recent":
          setShowRecentOpen(true);
          break;
        case "close_tab": {
          const a = useAppStore.getState().activeTabId;
          if (a) closeTab(a);
          break;
        }
        case "save":
          performSave();
          break;
        case "save_as":
          handleSaveAs();
          break;
        case "find_in_vault":
          setShowSearch(true);
          break;
        case "find_in_file":
          setShowFindBar(true);
          break;
        case "quick_open":
          setShowQuickOpen(true);
          break;
        case "command_palette":
          setShowCommandPalette(true);
          break;
        case "toggle_source_mode":
          toggleSourceMode();
          break;
        case "toggle_sidebar":
          toggleSidebar();
          break;
        case "toggle_outline":
          toggleOutline();
          break;
        case "toggle_focus":
          toggleFocusMode();
          break;
        case "toggle_typewriter":
          toggleTypewriterMode();
          break;
        case "theme_light":
          setTheme("light");
          break;
        case "theme_dark":
          setTheme("dark");
          break;
        case "theme_sepia":
          setTheme("sepia");
          break;
        case "export_html":
          handleExportHtml();
          break;
        case "export_pdf":
          handleExportPdf();
          break;
        case "about":
          setShowAbout(true);
          break;
        case "settings":
          setShowSettings(true);
          break;
      }
    }).then((u) => (unMenu = u));

    listenVaultChanged(() => refreshVault()).then((u) => (unVault = u));
    return () => {
      unMenu?.();
      unVault?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExportHtml() {
    if (!tab) return;
    const baseName = (tab.name || "Untitled").replace(/\.[^.]+$/, "");
    try {
      await exportHtml(tab.content, baseName);
    } catch (e) {
      console.error("exportHtml failed", e);
    }
  }
  async function handleExportPdf() {
    if (!tab) return;
    const title = tab.name || "Untitled";
    try {
      await exportPdfViaPrint(tab.content, title);
    } catch (e) {
      console.error("exportPdf failed", e);
    }
  }

  const setActivePathAndName = useAppStore((s) => s.setActivePathAndName);

  async function handleSaveAs() {
    const state = useAppStore.getState();
    const t = state.activeTabId
      ? state.tabs.find((x) => x.id === state.activeTabId)
      : null;
    if (!t) return;
    // For scratch buffers, derive the default name from the first H1
    // in the content (slugified) so the user doesn't always have to
    // type "Untitled" each time.
    const fromH1 = !t.path ? slugifyForFilename(firstHeadingText(t.content) ?? "") : "";
    const defaultName = t.path
      ? t.path.split("/").pop() || "Untitled.md"
      : `${fromH1 || (t.name || "Untitled").replace(/\.[^.]+$/, "")}.md`;
    try {
      const raw = await pickSavePath(defaultName);
      if (!raw) return;
      // Auto-append .md if the picked name has no markdown-ish extension.
      // This matches the file-association list (md / markdown / mdx / mkd).
      const target = /\.(md|markdown|mdx|mkd)$/i.test(raw) ? raw : `${raw}.md`;
      const newMtime = await writeFile(target, t.content, null);
      const fileName = target.split("/").pop() || target;
      setActivePathAndName(target, fileName, newMtime);
    } catch (e) {
      console.error("saveAs failed", e);
      setActiveStatus("error", String(e));
    }
  }

  // Keyboard shortcuts — driven by lib/shortcuts.ts (user-overridable) so
  // they can be re-bound from the Settings dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Save (potentially Save As)
      if (matchesShortcut(e, "save")) {
        e.preventDefault();
        if (saveTimerRef.current !== null) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        performSave();
        return;
      }
      if (matchesShortcut(e, "saveAll")) {
        e.preventDefault();
        saveAll();
        return;
      }
      if (matchesShortcut(e, "saveAs")) {
        e.preventDefault();
        handleSaveAs();
        return;
      }
      if (matchesShortcut(e, "openVault")) {
        e.preventDefault();
        handleOpenVault();
        return;
      }
      if (matchesShortcut(e, "openFile")) {
        e.preventDefault();
        handleOpenFile();
        return;
      }
      if (matchesShortcut(e, "quickOpen")) {
        e.preventDefault();
        setShowQuickOpen(true);
        return;
      }
      if (matchesShortcut(e, "commandPalette")) {
        e.preventDefault();
        setShowCommandPalette(true);
        return;
      }
      if (matchesShortcut(e, "findInVault")) {
        e.preventDefault();
        setShowSearch(true);
        return;
      }
      if (matchesShortcut(e, "findInFile")) {
        // CM6 binds ⌘F natively in source mode; let it through.
        if (!sourceMode) {
          e.preventDefault();
          setShowFindBar(true);
        }
        return;
      }
      if (matchesShortcut(e, "settings")) {
        e.preventDefault();
        setShowSettings(true);
        return;
      }
      if (matchesShortcut(e, "toggleSourceMode")) {
        e.preventDefault();
        toggleSourceMode();
        return;
      }
      if (matchesShortcut(e, "toggleSidebar")) {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      if (matchesShortcut(e, "nextTab")) {
        e.preventDefault();
        useAppStore.getState().activateNextTab();
        return;
      }
      if (matchesShortcut(e, "prevTab")) {
        e.preventDefault();
        useAppStore.getState().activatePrevTab();
        return;
      }
      // Ctrl+Tab / Ctrl+Shift+Tab — alternate next/prev tab bindings
      // (VSCode / browser convention). Distinct from the user-bound
      // shortcuts so both pairs work simultaneously.
      if (e.ctrlKey && !e.metaKey && !e.altKey && e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) useAppStore.getState().activatePrevTab();
        else useAppStore.getState().activateNextTab();
        return;
      }
      if (matchesShortcut(e, "reopenClosed")) {
        e.preventDefault();
        reopenLastClosed();
        return;
      }
      if (matchesShortcut(e, "fmtBold")) {
        e.preventDefault();
        wrapMarkdown("**", "**");
        return;
      }
      if (matchesShortcut(e, "fmtItalic")) {
        e.preventDefault();
        wrapMarkdown("*", "*");
        return;
      }
      if (matchesShortcut(e, "fmtCode")) {
        e.preventDefault();
        wrapMarkdown("`", "`");
        return;
      }
      if (matchesShortcut(e, "fmtStrike")) {
        e.preventDefault();
        wrapMarkdown("~~", "~~");
        return;
      }
      if (matchesShortcut(e, "moveLineUp")) {
        if (moveLineUp()) {
          e.preventDefault();
          return;
        }
      }
      if (matchesShortcut(e, "moveLineDown")) {
        if (moveLineDown()) {
          e.preventDefault();
          return;
        }
      }
      if (matchesShortcut(e, "duplicateLine")) {
        if (duplicateLine()) {
          e.preventDefault();
          return;
        }
      }
      if (matchesShortcut(e, "toggleBlockquote")) {
        if (toggleBlockquote()) {
          e.preventDefault();
          return;
        }
      }
      if (matchesShortcut(e, "headingUp")) {
        if (cycleHeadingLevel(1)) {
          e.preventDefault();
          return;
        }
      }
      if (matchesShortcut(e, "headingDown")) {
        if (cycleHeadingLevel(-1)) {
          e.preventDefault();
          return;
        }
      }
      if (matchesShortcut(e, "listBullet")) {
        if (toggleList("bullet")) {
          e.preventDefault();
          return;
        }
      }
      if (matchesShortcut(e, "listOrdered")) {
        if (toggleList("ordered")) {
          e.preventDefault();
          return;
        }
      }
      if (matchesShortcut(e, "listTask")) {
        if (toggleList("task")) {
          e.preventDefault();
          return;
        }
      }
      if (matchesShortcut(e, "zoomIn")) {
        e.preventDefault();
        const s = useAppStore.getState();
        s.setSettings({ fontSize: s.fontSize + 1 });
        return;
      }
      if (matchesShortcut(e, "zoomOut")) {
        e.preventDefault();
        const s = useAppStore.getState();
        s.setSettings({ fontSize: s.fontSize - 1 });
        return;
      }
      if (matchesShortcut(e, "zoomReset")) {
        e.preventDefault();
        useAppStore.getState().setSettings({ fontSize: 16 });
        return;
      }
      if (matchesShortcut(e, "insertLink")) {
        e.preventDefault();
        promptInsertLink();
        return;
      }
      if (matchesShortcut(e, "nextHeading")) {
        e.preventDefault();
        jumpToHeading("next");
        return;
      }
      if (matchesShortcut(e, "prevHeading")) {
        e.preventDefault();
        jumpToHeading("prev");
        return;
      }
      if (matchesShortcut(e, "toggleOutline")) {
        e.preventDefault();
        toggleOutline();
        return;
      }
      if (matchesShortcut(e, "moveTabLeft")) {
        e.preventDefault();
        useAppStore.getState().moveActiveTab("left");
        return;
      }
      if (matchesShortcut(e, "moveTabRight")) {
        e.preventDefault();
        useAppStore.getState().moveActiveTab("right");
        return;
      }
      if (matchesShortcut(e, "cycleTheme")) {
        e.preventDefault();
        const s = useAppStore.getState();
        s.setTheme(nextTheme(s.theme));
        return;
      }
      if (matchesShortcut(e, "showCheatsheet")) {
        e.preventDefault();
        setShowCheatsheet(true);
        return;
      }
      if (matchesShortcut(e, "insertHr")) {
        e.preventDefault();
        insertMarkdown("\n\n---\n\n");
        return;
      }
      // Cmd+1..9 = jump to tab N (last digit = last tab; matches browser).
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= 9) {
          e.preventDefault();
          const tabs = useAppStore.getState().tabs;
          const idx = n === 9 ? tabs.length - 1 : n - 1;
          useAppStore.getState().activateTabAt(idx);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performSave, saveAll, sourceMode]);

  const fileKey = tab?.id ?? "__none__";
  const initialValue = tab?.content ?? "";
  const isDark = resolveTheme(theme) === "dark";

  // Build commands for the palette
  const commands: Command[] = useMemo(() => {
    const base: Command[] = [
      { id: "new_file", label: "New File", shortcut: "⌘N", run: newScratchTab },
      {
        id: "new_file_in_vault",
        label: "New File in Vault…",
        run: newFileInVault,
      },
      {
        id: "close_all_tabs",
        label: "Close All Tabs",
        run: () => useAppStore.getState().closeAllTabs(),
      },
      {
        id: "next_tab",
        label: "Next Tab",
        shortcut: "⌘⌥]",
        run: () => useAppStore.getState().activateNextTab(),
      },
      {
        id: "prev_tab",
        label: "Previous Tab",
        shortcut: "⌘⌥[",
        run: () => useAppStore.getState().activatePrevTab(),
      },
      {
        id: "move_tab_first",
        label: "Move Tab to First",
        run: () => useAppStore.getState().moveActiveTabToEdge("first"),
      },
      {
        id: "move_tab_last",
        label: "Move Tab to Last",
        run: () => useAppStore.getState().moveActiveTabToEdge("last"),
      },
      {
        id: "toggle_pin_tab",
        label: "Pin / Unpin Active Tab",
        run: () => {
          const id = useAppStore.getState().activeTabId;
          if (id) useAppStore.getState().toggleTabPinned(id);
        },
      },
      {
        id: "reopen_closed_tab",
        label: "Reopen Last Closed Tab",
        shortcut: "⌘⇧T",
        run: () => {
          reopenLastClosed();
        },
      },
      {
        id: "copy_file_path",
        label: "Copy File Path",
        run: () => {
          const t2 = getActiveTab(useAppStore.getState());
          if (!t2?.path) {
            showToast(tr("toast.copyFailed"));
            return;
          }
          navigator.clipboard
            .writeText(t2.path)
            .then(() => showToast(tr("toast.copied", t2.path ?? "")))
            .catch(() => showToast(tr("toast.copyFailed")));
        },
      },
      {
        id: "copy_relative_path",
        label: "Copy Vault-relative Path",
        run: () => {
          const s = useAppStore.getState();
          const t2 = getActiveTab(s);
          if (!t2?.path) {
            showToast(tr("toast.copyFailed"));
            return;
          }
          const root = s.vaultRoot;
          let rel = t2.path;
          if (root && t2.path.startsWith(`${root}/`)) {
            rel = t2.path.slice(root.length + 1);
          } else if (root && t2.path === root) {
            rel = "";
          }
          navigator.clipboard
            .writeText(rel)
            .then(() => showToast(tr("toast.copied", rel)))
            .catch(() => showToast(tr("toast.copyFailed")));
        },
      },
      {
        id: "cursor_doc_start",
        label: "Go to Document Start (Source)",
        run: async () => {
          const view = getActiveSourceView();
          if (!view) return;
          const { cursorDocStart } = await import("@codemirror/commands");
          cursorDocStart(view);
        },
      },
      {
        id: "cursor_doc_end",
        label: "Go to Document End (Source)",
        run: async () => {
          const view = getActiveSourceView();
          if (!view) return;
          const { cursorDocEnd } = await import("@codemirror/commands");
          cursorDocEnd(view);
        },
      },
      {
        id: "select_next_occurrence",
        label: "Select Next Occurrence (Source)",
        shortcut: "⌘D",
        run: async () => {
          const view = getActiveSourceView();
          if (!view) return;
          const { selectNextOccurrence } = await import("@codemirror/search");
          selectNextOccurrence(view);
        },
      },
      {
        id: "jump_to_line",
        label: "Jump to Line… (Source)",
        run: () => {
          const view = getActiveSourceView();
          if (!view) {
            showToast(tr("toast.jumpToLineNeedsSource"));
            return;
          }
          const raw = window.prompt(tr("prompt.jumpToLine"), "1");
          if (!raw) return;
          const n = Number(raw);
          if (!Number.isInteger(n) || n < 1) {
            showToast(tr("toast.jumpToLineBad"));
            return;
          }
          const lineIdx = Math.min(n, view.state.doc.lines);
          const lineObj = view.state.doc.line(lineIdx);
          view.dispatch({
            selection: { anchor: lineObj.from, head: lineObj.from },
            scrollIntoView: true,
          });
          view.focus();
        },
      },
      {
        id: "reload_from_disk",
        label: "Reload from Disk",
        run: reloadFromDisk,
      },
      {
        id: "reload_all_files",
        label: "Reload All Files from Disk",
        run: async () => {
          const state = useAppStore.getState();
          const targets = state.tabs.filter((tx) => tx.path);
          if (targets.length === 0) return;
          // Confirm if any targeted tab has unsaved changes.
          const dirty = targets.find((tx) => tx.status === "dirty");
          if (dirty) {
            const ok = window.confirm(tr("reload.confirmDirtyAll", dirty.name));
            if (!ok) return;
          }
          let reloaded = 0;
          let failed = 0;
          await Promise.allSettled(
            targets.map(async (tx) => {
              try {
                const loaded = await readFile(String(tx.path));
                useAppStore.setState((s) => ({
                  tabs: s.tabs.map((c) =>
                    c.id === tx.id
                      ? {
                          ...c,
                          content: loaded.content,
                          mtimeMs: loaded.mtime_ms,
                          status: "saved",
                          errorMessage: null,
                        }
                      : c,
                  ),
                }));
                reloaded += 1;
              } catch {
                failed += 1;
              }
            }),
          );
          setExternalMtime(null);
          if (failed === 0) {
            showToast(tr("toast.reloadedAll", reloaded));
          } else {
            showToast(tr("toast.reloadAllPartial", reloaded, failed));
          }
        },
      },
      {
        id: "toggle_toolbar",
        label: "Toggle Toolbar",
        run: () => {
          const s = useAppStore.getState();
          s.setSettings({ showToolbar: !s.showToolbar });
        },
      },
      {
        id: "toggle_tab_bar",
        label: "Toggle Tab Bar",
        run: () => {
          const s = useAppStore.getState();
          s.setSettings({ showTabBar: !s.showTabBar });
        },
      },
      {
        id: "toggle_vault_sort",
        label: "Toggle Vault Sort (Name ↔ Recent)",
        run: () => {
          const s = useAppStore.getState();
          s.setSettings({
            vaultSort: s.vaultSort === "name" ? "mtime" : "name",
          });
        },
      },
      {
        id: "toggle_spellcheck",
        label: "Toggle Spell Check",
        run: () => {
          const s = useAppStore.getState();
          s.setSettings({ spellcheck: !s.spellcheck });
        },
      },
      {
        id: "reveal_in_tree",
        label: "Reveal in File Tree",
        run: () => {
          const s = useAppStore.getState();
          if (!s.sidebarOpen) s.toggleSidebar();
          // Defer the event so React commits the open-sidebar state and
          // mounts FileTree before the listener fires.
          window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent("markup:reveal-active"));
          }, 0);
        },
      },
      {
        id: "toggle_line_wrap",
        label: "Toggle Line Wrap (Source)",
        run: () => {
          const s = useAppStore.getState();
          s.setSettings({ lineWrap: !s.lineWrap });
        },
      },
      {
        id: "toggle_line_numbers",
        label: "Toggle Line Numbers (Source)",
        run: () => {
          const s = useAppStore.getState();
          s.setSettings({ showLineNumbers: !s.showLineNumbers });
        },
      },
      {
        id: "new_window",
        label: "New Window",
        shortcut: "⌘⇧N",
        run: () => openNewWindow().catch(console.error),
      },
      { id: "open_file", label: "Open File…", shortcut: "⌘O", run: handleOpenFile },
      { id: "open_vault", label: "Open Vault…", shortcut: "⌘⇧O", run: handleOpenVault },
      { id: "save", label: "Save", shortcut: "⌘S", run: performSave },
      { id: "save_as", label: "Save As…", shortcut: "⌘⇧S", run: handleSaveAs },
      { id: "save_all", label: "Save All", run: saveAll },
      {
        id: "rename_file",
        label: "Rename Active File…",
        run: renameActiveFile,
      },
      {
        id: "export_settings_file",
        label: "Export Settings (Download File)",
        run: () => {
          const payload = serializeSettings(useAppStore.getState());
          const blob = new Blob([payload], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "markup-settings.json";
          a.click();
          URL.revokeObjectURL(url);
        },
      },
      {
        id: "export_settings",
        label: "Export Settings (Copy JSON)",
        run: () => {
          const payload = serializeSettings(useAppStore.getState());
          navigator.clipboard
            .writeText(payload)
            .then(() => showToast(tr("toast.settingsCopied")))
            .catch(() => showToast(tr("toast.copyFailed")));
        },
      },
      {
        id: "set_word_count_goal",
        label: "Set Word Count Goal…",
        run: () => {
          const cur = useAppStore.getState().wordCountGoal;
          const raw = window.prompt(tr("prompt.wordGoal"), String(cur || 500));
          if (raw === null) return;
          const n = Number(raw);
          if (!Number.isFinite(n) || n < 0) {
            showToast(tr("toast.wordGoalBad"));
            return;
          }
          useAppStore.getState().setSettings({ wordCountGoal: Math.floor(n) });
        },
      },
      {
        id: "import_settings",
        label: "Import Settings…",
        run: () => {
          const raw = window.prompt(tr("prompt.importSettings"), "");
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
              useAppStore.getState().setSettings(parsed);
              showToast(tr("toast.settingsImported"));
            } else {
              showToast(tr("toast.settingsImportBad"));
            }
          } catch {
            showToast(tr("toast.settingsImportBad"));
          }
        },
      },
      {
        id: "insert_hr",
        label: "Insert Horizontal Rule",
        shortcut: "⌘⇧-",
        run: () => {
          insertMarkdown("\n\n---\n\n");
        },
      },
      {
        id: "wrap_inline_math",
        label: "Wrap Selection as Inline Math ($…$)",
        run: () => {
          wrapMarkdown("$", "$");
        },
      },
      {
        id: "insert_math_block",
        label: "Insert Math Block ($$…$$)",
        run: () => {
          insertMarkdown("\n\n$$\n\n$$\n\n");
        },
      },
      {
        id: "insert_mermaid",
        label: "Insert Mermaid Diagram",
        run: () => {
          insertMarkdown("\n\n```mermaid\ngraph LR\n  A --> B\n```\n\n");
        },
      },
      {
        id: "insert_callout_note",
        label: "Insert Callout: Note",
        run: () => {
          insertMarkdown("\n\n> [!NOTE]\n> \n\n");
        },
      },
      {
        id: "insert_callout_warning",
        label: "Insert Callout: Warning",
        run: () => {
          insertMarkdown("\n\n> [!WARNING]\n> \n\n");
        },
      },
      {
        id: "insert_callout_tip",
        label: "Insert Callout: Tip",
        run: () => {
          insertMarkdown("\n\n> [!TIP]\n> \n\n");
        },
      },
      {
        id: "format_bold",
        label: "Bold",
        shortcut: "⌘B",
        run: () => {
          wrapMarkdown("**", "**");
        },
      },
      {
        id: "format_italic",
        label: "Italic",
        shortcut: "⌘I",
        run: () => {
          wrapMarkdown("*", "*");
        },
      },
      {
        id: "format_inline_code",
        label: "Inline Code",
        shortcut: "⌘E",
        run: () => {
          wrapMarkdown("`", "`");
        },
      },
      {
        id: "format_strike",
        label: "Strikethrough",
        shortcut: "⌘⇧X",
        run: () => {
          wrapMarkdown("~~", "~~");
        },
      },
      {
        id: "wrap_code_block",
        label: "Wrap Selection as Code Block…",
        run: () => {
          const lang = window.prompt(tr("prompt.codeBlockLang"), "ts")?.trim() ?? "";
          wrapMarkdown(`\n\n\`\`\`${lang}\n`, "\n```\n\n");
        },
      },
      {
        id: "wrap_collapsible",
        label: "Wrap Selection in Collapsible Block",
        run: () => {
          wrapMarkdown(
            "\n\n<details>\n<summary>Details</summary>\n\n",
            "\n\n</details>\n\n",
          );
        },
      },
      {
        id: "wrap_html_comment",
        label: "Wrap Selection in HTML Comment",
        run: () => {
          wrapMarkdown("<!-- ", " -->");
        },
      },
      {
        id: "insert_today",
        label: "Insert Today's Date",
        run: () => {
          const d = new Date();
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          insertMarkdown(`${yyyy}-${mm}-${dd}`);
        },
      },
      {
        id: "move_line_up",
        label: "Move Line Up (Source)",
        shortcut: "⌥↑",
        run: () => {
          moveLineUp();
        },
      },
      {
        id: "move_line_down",
        label: "Move Line Down (Source)",
        shortcut: "⌥↓",
        run: () => {
          moveLineDown();
        },
      },
      {
        id: "duplicate_line",
        label: "Duplicate Line (Source)",
        shortcut: "⇧⌥↓",
        run: () => {
          duplicateLine();
        },
      },
      {
        id: "delete_line",
        label: "Delete Current Line (Source)",
        shortcut: "⌘⇧K",
        run: async () => {
          const view = getActiveSourceView();
          if (!view) return;
          // deleteLine is a CM6 standalone command — call it directly.
          const { deleteLine } = await import("@codemirror/commands");
          deleteLine(view);
        },
      },
      {
        id: "copy_line_up",
        label: "Copy Line Up (Source)",
        run: async () => {
          const view = getActiveSourceView();
          if (!view) return;
          const { copyLineUp } = await import("@codemirror/commands");
          copyLineUp(view);
        },
      },
      {
        id: "copy_line_down",
        label: "Copy Line Down (Source)",
        run: async () => {
          const view = getActiveSourceView();
          if (!view) return;
          const { copyLineDown } = await import("@codemirror/commands");
          copyLineDown(view);
        },
      },
      {
        id: "toggle_blockquote",
        label: "Toggle Blockquote (Source)",
        run: () => {
          toggleBlockquote();
        },
      },
      {
        id: "promote_heading",
        label: "Promote Heading (+ #)",
        shortcut: "⌘⌥↑",
        run: () => {
          cycleHeadingLevel(1);
        },
      },
      {
        id: "demote_heading",
        label: "Demote Heading (- #)",
        shortcut: "⌘⌥↓",
        run: () => {
          cycleHeadingLevel(-1);
        },
      },
      ...([1, 2, 3, 4, 5, 6] as const).map<Command>((lvl) => ({
        id: `set_heading_${lvl}`,
        label: `Set Heading H${lvl}`,
        run: () => {
          setHeadingLevel(lvl);
        },
      })),
      {
        id: "set_heading_0",
        label: "Set Heading: None",
        run: () => {
          setHeadingLevel(0);
        },
      },
      {
        id: "list_bullet",
        label: "Toggle Bullet List",
        shortcut: "⌘⇧8",
        run: () => {
          toggleList("bullet");
        },
      },
      {
        id: "list_ordered",
        label: "Toggle Numbered List",
        shortcut: "⌘⇧7",
        run: () => {
          toggleList("ordered");
        },
      },
      {
        id: "list_task",
        label: "Toggle Task List",
        shortcut: "⌘⇧9",
        run: () => {
          toggleList("task");
        },
      },
      {
        id: "toggle_task_checkbox",
        label: "Toggle Task Checkbox on Line",
        run: () => {
          toggleTaskCheckboxOnLine();
        },
      },
      {
        id: "format_table",
        label: "Format Table (Source)",
        run: () => {
          formatTable();
        },
      },
      {
        id: "move_section_up",
        label: "Move Section Up (Source)",
        run: () => {
          moveSectionUp();
        },
      },
      {
        id: "move_section_down",
        label: "Move Section Down (Source)",
        run: () => {
          moveSectionDown();
        },
      },
      {
        id: "move_section_to_top",
        label: "Move Section to Top (Source)",
        run: () => {
          moveSectionToTop();
        },
      },
      {
        id: "move_section_to_bottom",
        label: "Move Section to Bottom (Source)",
        run: () => {
          moveSectionToBottom();
        },
      },
      {
        id: "insert_frontmatter",
        label: "Insert YAML Frontmatter",
        run: () => {
          if (!tab) return;
          if (tab.content.startsWith("---\n")) {
            showToast(tr("toast.frontmatterExists"));
            return;
          }
          const d = new Date();
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          const fm = `---\ntitle: ${tab.name.replace(/\.md$/i, "")}\ndate: ${yyyy}-${mm}-${dd}\n---\n\n`;
          updateActiveContent(fm + tab.content);
        },
      },
      {
        id: "sort_lines_asc",
        label: "Sort Lines Ascending",
        run: () => {
          sortLines("asc");
        },
      },
      {
        id: "sort_lines_desc",
        label: "Sort Lines Descending",
        run: () => {
          sortLines("desc");
        },
      },
      {
        id: "reverse_lines",
        label: "Reverse Lines",
        run: () => {
          reverseLines();
        },
      },
      {
        id: "dedup_lines",
        label: "Remove Duplicate Lines",
        run: () => {
          dedupLines();
        },
      },
      {
        id: "case_upper",
        label: "Selection: UPPERCASE",
        run: () => {
          transformSelection((s) => s.toLocaleUpperCase());
        },
      },
      {
        id: "case_lower",
        label: "Selection: lowercase",
        run: () => {
          transformSelection((s) => s.toLocaleLowerCase());
        },
      },
      {
        id: "case_title",
        label: "Selection: Title Case",
        run: () => {
          transformSelection(toTitleCase);
        },
      },
      {
        id: "tabs_to_spaces",
        label: "Selection: Tabs → Spaces (2)",
        run: () => {
          transformSelection((s) => s.replace(/\t/g, "  "));
        },
      },
      {
        id: "spaces_to_tabs",
        label: "Selection: Spaces (2) → Tabs",
        run: () => {
          transformSelection((s) =>
            s.replace(/^( {2})+/gm, (m) => "\t".repeat(m.length / 2)),
          );
        },
      },
      {
        id: "copy_html",
        label: "Copy as HTML",
        run: async () => {
          if (!tab) {
            showToast(tr("toast.copyFailed"));
            return;
          }
          try {
            const html = await renderHtml(tab.content, tab.name, exportTheme);
            await navigator.clipboard.writeText(html);
            showToast(tr("toast.copiedHtml"));
          } catch (e) {
            console.error("copy_html failed", e);
            showToast(tr("toast.copyFailed"));
          }
        },
      },
      {
        id: "strip_md_in_place",
        label: "Selection: Strip Markdown",
        run: () => {
          transformSelection(stripMarkdown);
        },
      },
      {
        id: "copy_plain_text",
        label: "Copy as Plain Text",
        run: () => {
          const sel = window.getSelection()?.toString();
          const v = getActiveSourceView();
          let source = "";
          if (sel && sel.length > 0) {
            source = sel;
          } else if (v) {
            const { from, to } = v.state.selection.main;
            source = from === to ? v.state.doc.toString() : v.state.sliceDoc(from, to);
          } else {
            source = tab?.content ?? "";
          }
          if (!source) {
            showToast(tr("toast.copyFailed"));
            return;
          }
          navigator.clipboard
            .writeText(stripMarkdown(source))
            .then(() => showToast(tr("toast.copiedPlainText")))
            .catch(() => showToast(tr("toast.copyFailed")));
        },
      },
      {
        id: "zoom_in",
        label: "Zoom In",
        shortcut: "⌘=",
        run: () => {
          const s = useAppStore.getState();
          s.setSettings({ fontSize: s.fontSize + 1 });
        },
      },
      {
        id: "zoom_out",
        label: "Zoom Out",
        shortcut: "⌘-",
        run: () => {
          const s = useAppStore.getState();
          s.setSettings({ fontSize: s.fontSize - 1 });
        },
      },
      {
        id: "zoom_reset",
        label: "Reset Zoom",
        shortcut: "⌘0",
        run: () => {
          useAppStore.getState().setSettings({ fontSize: 16 });
        },
      },
      {
        id: "prose_wider",
        label: "Prose: Wider Column",
        run: () => {
          const s = useAppStore.getState();
          s.setSettings({ proseMaxWidth: s.proseMaxWidth + 40 });
        },
      },
      {
        id: "prose_narrower",
        label: "Prose: Narrower Column",
        run: () => {
          const s = useAppStore.getState();
          s.setSettings({ proseMaxWidth: s.proseMaxWidth - 40 });
        },
      },
      {
        id: "insert_link",
        label: "Insert Link…",
        shortcut: "⌘K",
        run: promptInsertLink,
      },
      {
        id: "follow_wikilink_at_cursor",
        label: "Follow Wikilink at Cursor",
        run: async () => {
          if (!getActiveSourceView()) {
            showToast(tr("toast.followNeedsSource"));
            return;
          }
          const name = wikilinkAtCursor();
          if (!name) {
            showToast(tr("toast.noWikilinkAtCursor"));
            return;
          }
          const target = findVaultFile(useAppStore.getState().vaultFiles, name);
          if (!target) {
            showToast(tr("toast.wikilinkMiss", name));
            return;
          }
          try {
            const loaded = await readFile(target.path);
            openLoadedFile(loaded);
          } catch (e) {
            console.error("follow_wikilink failed", e);
            showToast(tr("toast.openFailed", target.path));
          }
        },
      },
      {
        id: "toggle_wikilink",
        label: "Toggle Wikilink on Selection",
        run: () => {
          transformSelection((s) => {
            const trimmed = s.trim();
            if (trimmed.startsWith("[[") && trimmed.endsWith("]]")) {
              return trimmed.slice(2, -2);
            }
            return `[[${trimmed}]]`;
          });
        },
      },
      {
        id: "paste_as_link",
        label: "Paste Clipboard as Markdown Link",
        run: async () => {
          let raw = "";
          try {
            raw = (await navigator.clipboard.readText()).trim();
          } catch {
            showToast(tr("toast.clipboardReadFailed"));
            return;
          }
          if (!raw || !/^(https?:\/\/|mailto:|markup:\/\/)\S+$/i.test(raw)) {
            showToast(tr("toast.clipboardNotUrl"));
            return;
          }
          const selText = window.getSelection()?.toString();
          if (selText) {
            transformSelection(() => `[${selText}](${raw})`);
          } else {
            const text = window.prompt(tr("prompt.linkText"), raw) ?? raw;
            insertMarkdown(`[${text}](${raw})`);
          }
        },
      },
      {
        id: "next_heading",
        label: "Next Heading",
        shortcut: "⌘⇧J",
        run: () => jumpToHeading("next"),
      },
      {
        id: "prev_heading",
        label: "Previous Heading",
        shortcut: "⌘⇧K",
        run: () => jumpToHeading("prev"),
      },
      {
        id: "insert_table",
        label: "Insert Table…",
        run: () => {
          const raw = window.prompt(tr("prompt.tableSize"), "3x3");
          if (!raw) return;
          const m = raw.trim().match(/^(\d+)\s*[x×]\s*(\d+)$/i);
          if (!m) {
            showToast(tr("toast.tableSizeBad"));
            return;
          }
          insertMarkdown(`\n\n${buildTableMarkdown(Number(m[1]), Number(m[2]))}\n`);
        },
      },
      {
        id: "quick_open",
        label: "Quick Open",
        shortcut: "⌘P",
        run: () => setShowQuickOpen(true),
      },
      { id: "about", label: "About Markup", run: () => setShowAbout(true) },
      {
        id: "shortcuts_cheatsheet",
        label: "Shortcuts Cheatsheet",
        shortcut: "⌘⇧/",
        run: () => setShowCheatsheet(true),
      },
      {
        id: "settings",
        label: "Settings…",
        shortcut: "⌘,",
        run: () => setShowSettings(true),
      },
      {
        id: "copy_paragraph_link",
        label: "Copy Link to Paragraph",
        run: copyParagraphLink,
      },
      {
        id: "insert_wikilink",
        label: tr("cmd.insertWikilink"),
        run: () => {
          setWikilinkPickerMode("full");
          setShowWikilinkPicker(true);
        },
      },
      {
        id: "reset_settings",
        label: tr("cmd.resetSettings"),
        run: () => {
          if (!window.confirm(tr("settings.confirmReset"))) return;
          // Reset every persisted preference to its default — store +
          // shortcuts + theme + locale + onboarding flag.
          const s = useAppStore.getState();
          s.setSettings({
            fontSize: 16,
            proseMaxWidth: 720,
            autosaveMs: 300,
            imagePasteDir: "assets",
            exportTheme: "github",
            spellcheck: false,
            lineWrap: true,
            sidebarWidth: 260,
            outlineWidth: 220,
            saveOnBlur: false,
            trimOnSave: false,
            showLineNumbers: true,
            wordCountGoal: 0,
            showToolbar: true,
            showTabBar: true,
            vaultSort: "name",
          });
          s.setTheme("auto");
          s.setRecentFiles([]);
          if (s.outlineOpen) s.toggleOutline();
          if (s.focusMode) s.toggleFocusMode();
          if (s.typewriterMode) s.toggleTypewriterMode();
          resetAllShortcuts();
          // Drop any persisted state that bypasses store (locale + onboarded)
          try {
            localStorage.removeItem("markup.locale");
            localStorage.removeItem("markup.onboarded");
          } catch {
            /*ignore*/
          }
        },
      },
      {
        id: "find_in_vault",
        label: "Find in Vault",
        shortcut: "⌘⇧F",
        run: () => {
          setSearchInitialQuery("");
          setShowSearch(true);
        },
      },
      {
        id: "find_in_vault_selection",
        label: "Find Selection in Vault",
        run: () => {
          const sel =
            window.getSelection()?.toString() ||
            (() => {
              const v = getActiveSourceView();
              if (!v) return "";
              const { from, to } = v.state.selection.main;
              return from === to ? "" : v.state.sliceDoc(from, to);
            })();
          if (!sel.trim()) {
            setSearchInitialQuery("");
          } else {
            setSearchInitialQuery(sel.trim().slice(0, 200));
          }
          setShowSearch(true);
        },
      },
      {
        id: "toggle_source_mode",
        label: "Toggle Source Mode",
        shortcut: "⌘/",
        run: toggleSourceMode,
      },
      {
        id: "toggle_sidebar",
        label: "Toggle Sidebar",
        shortcut: "⌘B",
        run: toggleSidebar,
      },
      { id: "toggle_outline", label: "Toggle Outline", run: toggleOutline },
      { id: "toggle_focus", label: "Toggle Focus Mode", run: toggleFocusMode },
      {
        id: "toggle_typewriter",
        label: "Toggle Typewriter Mode",
        run: toggleTypewriterMode,
      },
      {
        id: "cycle_theme",
        label: "Cycle Theme",
        shortcut: "⌘⌥T",
        run: () => {
          const s = useAppStore.getState();
          s.setTheme(nextTheme(s.theme));
        },
      },
      { id: "theme_auto", label: "Theme: Auto (system)", run: () => setTheme("auto") },
      { id: "theme_light", label: "Theme: Light", run: () => setTheme("light") },
      { id: "theme_dark", label: "Theme: Dark", run: () => setTheme("dark") },
      { id: "theme_sepia", label: "Theme: Sepia", run: () => setTheme("sepia") },
      { id: "export_html", label: "Export as HTML…", run: handleExportHtml },
      { id: "export_pdf", label: "Export as PDF (Print)…", run: handleExportPdf },
    ];
    // Attach Open Recent entries inline so users can fuzzy-search by
    // basename or full path without opening the dedicated quick-open UI.
    const recents: Command[] = recentFiles.slice(0, 10).map((p) => ({
      id: `open_recent:${p}`,
      label: `Open Recent: ${p.split("/").pop() ?? p}`,
      hint: p,
      run: () => {
        openRecent(p);
      },
    }));
    const recentVaultCmds: Command[] = recentVaults.slice(0, 10).map((p) => ({
      id: `open_recent_vault:${p}`,
      label: `Open Recent Vault: ${p.split("/").pop() ?? p}`,
      hint: p,
      run: () => {
        openRecentVault(p);
      },
    }));
    // Switch-to-tab entries: present every open tab as a palette command
    // so the user can fuzzy-search by name across all open documents.
    const switchTabCmds: Command[] = tabs.map((tx, i) => ({
      id: `switch_tab:${tx.id}`,
      label: `Switch to Tab: ${tx.name}`,
      hint: tx.path ?? `(unsaved · index ${i + 1})`,
      run: () => useAppStore.getState().setActiveTab(tx.id),
    }));
    return [...base, ...switchTabCmds, ...recents, ...recentVaultCmds];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.path, tab?.content, recentFiles, recentVaults, tabs]);

  // Recent-file picker uses CommandPalette wrapped with file commands
  const recentCommands: Command[] = useMemo(() => {
    return recentFiles.slice(0, 20).map((p) => ({
      id: `recent:${p}`,
      label: p.split("/").pop() ?? p,
      hint: p,
      run: async () => {
        try {
          const loaded = await readFile(p);
          openLoadedFile(loaded);
        } catch (e) {
          console.error("readFile failed", e);
        }
      },
    }));
  }, [recentFiles, openLoadedFile]);

  const showReload =
    externalMtime !== null && tab?.path != null && tab.path !== reloadPromptDismissed;

  return (
    <div className="flex flex-col h-full">
      {showToolbar && <Toolbar onInsertLink={promptInsertLink} />}
      {showTabBar && <TabBar />}
      {showReload && (
        <ReloadPrompt
          onReload={() => {
            setExternalMtime(null);
            setReloadPromptDismissed(null);
          }}
          onDismiss={() => setReloadPromptDismissed(tab?.path ?? null)}
        />
      )}
      <main className="flex-1 min-h-0 flex">
        {sidebarOpen && (
          <>
            <aside
              className="shrink-0 border-r border-black/5 dark:border-white/10 flex flex-col"
              style={{ width: sidebarWidth }}
            >
              <FileTree />
            </aside>
            <Resizer
              side="right"
              width={sidebarWidth}
              onChange={(w) => setSettings({ sidebarWidth: w })}
              label="Resize sidebar"
            />
          </>
        )}
        <section
          className="flex-1 min-w-0 overflow-auto"
          ref={editorScrollRef as React.RefObject<HTMLElement>}
          spellCheck={spellcheck}
        >
          <MarkupEditor
            fileKey={fileKey}
            initialValue={initialValue}
            sourceMode={sourceMode}
            isDark={isDark}
            onChange={handleEditorChange}
          />
        </section>
        {outlineOpen && (
          <>
            <Resizer
              side="left"
              width={outlineWidth}
              onChange={(w) => setSettings({ outlineWidth: w })}
              label="Resize outline"
            />
            <aside
              className="shrink-0 border-l border-black/5 dark:border-white/10 flex flex-col"
              style={{ width: outlineWidth }}
            >
              <Outline />
            </aside>
          </>
        )}
      </main>
      <StatusBar />
      {showFindBar && (
        <FindBar sourceMode={sourceMode} onClose={() => setShowFindBar(false)} />
      )}
      {showQuickOpen && <QuickOpen onClose={() => setShowQuickOpen(false)} />}
      {showSearch && (
        <SearchPanel
          initialQuery={searchInitialQuery}
          onClose={() => {
            setShowSearch(false);
            setSearchInitialQuery("");
          }}
        />
      )}
      {showCommandPalette && (
        <CommandPalette
          commands={commands}
          onClose={() => setShowCommandPalette(false)}
        />
      )}
      {showRecentOpen && (
        <CommandPalette
          commands={recentCommands}
          onClose={() => setShowRecentOpen(false)}
        />
      )}
      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
      {showCheatsheet && <ShortcutsCheatsheet onClose={() => setShowCheatsheet(false)} />}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
      {showOnboarding && (
        <Onboarding
          onSkip={dismissOnboarding}
          onOpenFile={() => {
            dismissOnboarding();
            handleOpenFile();
          }}
          onOpenVault={() => {
            dismissOnboarding();
            handleOpenVault();
          }}
        />
      )}
      {showWikilinkPicker && (
        <WikilinkPicker
          mode={wikilinkPickerMode}
          onClose={() => {
            setShowWikilinkPicker(false);
            setWikilinkPickerMode("full");
          }}
          onInsert={(text) => {
            // insertMarkdown picks the right surface (CM6 dispatch in
            // source mode, DOM Selection in WYSIWYG); falls back to
            // clipboard when neither editor has focus.
            if (insertMarkdown(text)) return;
            navigator.clipboard.writeText(text).catch(() => {});
            showToast(tr("toast.copied", text));
          }}
        />
      )}
      <ToastHost />
    </div>
  );
}

import type { VaultFile as RustVaultFile } from "./lib/types";
import type { VaultFile as StoreVaultFile } from "./store";
function toVaultFileTs(f: RustVaultFile): StoreVaultFile {
  return {
    path: f.path,
    relPath: f.rel_path,
    name: f.name,
    mtimeMs: f.mtime_ms,
    size: f.size,
  };
}
