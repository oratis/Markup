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
import { SearchPanel } from "./components/SearchPanel";
import { SettingsDialog } from "./components/SettingsDialog";
import { StatusBar } from "./components/StatusBar";
import { TabBar } from "./components/TabBar";
import { ToastHost, showToast } from "./components/Toast";
import { Toolbar } from "./components/Toolbar";
import { WikilinkPicker } from "./components/WikilinkPicker";
import { exportHtml, exportPdfViaPrint } from "./lib/export";
import { installFocusTypewriter } from "./lib/focus-typewriter";
import { useT } from "./lib/i18n";
import { installImageDrop } from "./lib/image-drop";
import { installImagePaste } from "./lib/image-paste";
import { buildParagraphLink } from "./lib/paragraph-link";
import { matches as matchesShortcut } from "./lib/shortcuts";
import { resolveTheme, subscribeSystemTheme } from "./lib/system-theme";
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

  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showRecentOpen, setShowRecentOpen] = useState(false);
  const [showFindBar, setShowFindBar] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
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
    } catch {
      /*ignore*/
    }
  }, [recentFiles]);

  // Settings → CSS variables + persist
  const exportTheme = useAppStore((s) => s.exportTheme);
  const imagePasteDir = useAppStore((s) => s.imagePasteDir);
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
        }),
      );
    } catch {
      /*ignore*/
    }
  }, [fontSize, proseMaxWidth, autosaveMs, imagePasteDir, exportTheme]);

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

  // Auto-trigger the wikilink picker when the user types `[[`. Only fires in
  // WYSIWYG (Milkdown / contenteditable) — source mode users can use the
  // command palette entry which is faster anyway. Source mode also has its
  // own keymap so reaching across is fragile.
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
      const newMtime = await writeFile(t.path, t.content, t.mtimeMs);
      setActiveMtime(newMtime);
      setActiveStatus("saved");
      // Remember mtime so vault-changed events from our own save don't trigger reload prompt
      setExternalMtime(null);
    } catch (err) {
      console.error("write_file failed", err);
      setActiveStatus("error", String(err));
    }
  }, [setActiveStatus, setActiveMtime]);

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

  const handleOpenVault = useCallback(async () => {
    try {
      const root = await pickVault();
      if (!root) return;
      const opened = await openVault(root);
      const files = await listVaultFiles();
      setVault(opened.root, files.map(toVaultFileTs));
    } catch (e) {
      console.error("open_vault failed", e);
    }
  }, [setVault]);

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
    const defaultName = t.path
      ? t.path.split("/").pop() || "Untitled.md"
      : `${(t.name || "Untitled").replace(/\.[^.]+$/, "")}.md`;
    try {
      const target = await pickSavePath(defaultName);
      if (!target) return;
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performSave, sourceMode]);

  const fileKey = tab?.id ?? "__none__";
  const initialValue = tab?.content ?? "";
  const isDark = resolveTheme(theme) === "dark";

  // Build commands for the palette
  const commands: Command[] = useMemo(() => {
    const base: Command[] = [
      { id: "new_file", label: "New File", shortcut: "⌘N", run: newScratchTab },
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
      {
        id: "quick_open",
        label: "Quick Open",
        shortcut: "⌘P",
        run: () => setShowQuickOpen(true),
      },
      { id: "about", label: "About Markup", run: () => setShowAbout(true) },
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
        id: "find_in_vault",
        label: "Find in Vault",
        shortcut: "⌘⇧F",
        run: () => setShowSearch(true),
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
      { id: "theme_auto", label: "Theme: Auto (system)", run: () => setTheme("auto") },
      { id: "theme_light", label: "Theme: Light", run: () => setTheme("light") },
      { id: "theme_dark", label: "Theme: Dark", run: () => setTheme("dark") },
      { id: "theme_sepia", label: "Theme: Sepia", run: () => setTheme("sepia") },
      { id: "export_html", label: "Export as HTML…", run: handleExportHtml },
      { id: "export_pdf", label: "Export as PDF (Print)…", run: handleExportPdf },
    ];
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.path, tab?.content]);

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
      <Toolbar />
      <TabBar />
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
          <aside className="w-[260px] shrink-0 border-r border-black/5 dark:border-white/10 flex flex-col">
            <FileTree />
          </aside>
        )}
        <section
          className="flex-1 min-w-0 overflow-auto"
          ref={editorScrollRef as React.RefObject<HTMLElement>}
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
          <aside className="w-[220px] shrink-0 border-l border-black/5 dark:border-white/10 flex flex-col">
            <Outline />
          </aside>
        )}
      </main>
      <StatusBar />
      {showFindBar && (
        <FindBar sourceMode={sourceMode} onClose={() => setShowFindBar(false)} />
      )}
      {showQuickOpen && <QuickOpen onClose={() => setShowQuickOpen(false)} />}
      {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}
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
            // Insert at the current selection in whichever editor has focus.
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode(text));
              sel.collapseToEnd();
            } else {
              navigator.clipboard.writeText(text).catch(() => {});
              showToast(tr("toast.copied", text));
            }
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
