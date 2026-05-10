import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { TabBar } from "./components/TabBar";
import { MarkupEditor } from "./components/Editor";
import { FileTree } from "./components/FileTree";
import { Outline } from "./components/Outline";
import { StatusBar } from "./components/StatusBar";
import { QuickOpen } from "./components/QuickOpen";
import { SearchPanel } from "./components/SearchPanel";
import { ReloadPrompt } from "./components/ReloadPrompt";
import { CommandPalette, type Command } from "./components/CommandPalette";
import { getActiveTab, useAppStore, type Theme } from "./store";
import {
  listenMenu,
  listenVaultChanged,
  listVaultFiles,
  openFileDialog,
  openVault,
  pickVault,
  readFile,
  writeFile,
} from "./lib/tauri";
import { installFocusTypewriter } from "./lib/focus-typewriter";
import { installImagePaste } from "./lib/image-paste";
import { exportHtml, exportPdfViaPrint } from "./lib/export";

const SAVE_DEBOUNCE_MS = 300;
const THEME_KEY = "markup.theme";
const SOURCE_MODE_KEY = "markup.sourceMode";
const SIDEBAR_KEY = "markup.sidebar";
const OUTLINE_KEY = "markup.outline";
const FOCUS_KEY = "markup.focus";
const TYPEWRITER_KEY = "markup.typewriter";
const RECENT_KEY = "markup.recentFiles";

function applyThemeToHtml(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark", "theme-sepia");
  root.classList.add(`theme-${theme}`);
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function applyClass(htmlClass: string, on: boolean) {
  document.documentElement.classList.toggle(htmlClass, on);
}

export function App() {
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
  const [reloadPromptDismissed, setReloadPromptDismissed] = useState<string | null>(
    null,
  );
  const [externalMtime, setExternalMtime] = useState<number | null>(null);

  const editorScrollRef = useRef<HTMLElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  // Restore prefs on mount
  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY) as Theme | null;
      if (t === "light" || t === "dark" || t === "sepia") setTheme(t);
      if (localStorage.getItem(SOURCE_MODE_KEY) === "true") setSourceMode(true);
      if (localStorage.getItem(SIDEBAR_KEY) === "true") toggleSidebar();
      if (localStorage.getItem(OUTLINE_KEY) === "true") toggleOutline();
      if (localStorage.getItem(FOCUS_KEY) === "true") toggleFocusMode();
      if (localStorage.getItem(TYPEWRITER_KEY) === "true") toggleTypewriterMode();
      const recent = localStorage.getItem(RECENT_KEY);
      if (recent) {
        try {
          const arr = JSON.parse(recent);
          if (Array.isArray(arr)) setRecentFiles(arr.filter((x) => typeof x === "string"));
        } catch {/*ignore*/}
      }
    } catch {/*ignore*/}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist + apply theme/source mode/sidebar
  useEffect(() => {
    applyThemeToHtml(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {/*ignore*/}
  }, [theme]);
  useEffect(() => {
    try { localStorage.setItem(SOURCE_MODE_KEY, String(sourceMode)); } catch {/*ignore*/}
  }, [sourceMode]);
  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen)); } catch {/*ignore*/}
  }, [sidebarOpen]);
  useEffect(() => {
    try { localStorage.setItem(OUTLINE_KEY, String(outlineOpen)); } catch {/*ignore*/}
  }, [outlineOpen]);
  useEffect(() => {
    applyClass("focus-mode", focusMode);
    try { localStorage.setItem(FOCUS_KEY, String(focusMode)); } catch {/*ignore*/}
  }, [focusMode]);
  useEffect(() => {
    applyClass("typewriter-mode", typewriterMode);
    try { localStorage.setItem(TYPEWRITER_KEY, String(typewriterMode)); } catch {/*ignore*/}
  }, [typewriterMode]);
  useEffect(() => {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recentFiles)); } catch {/*ignore*/}
  }, [recentFiles]);

  // Push recent file when active tab changes to a real file
  useEffect(() => {
    if (tab?.path) pushRecentFile(tab.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.path]);

  // Focus + Typewriter installer
  useEffect(() => {
    const dispose = installFocusTypewriter({
      scrollContainer: () => editorScrollRef.current,
      enabled: () => ({ focus: focusMode, typewriter: typewriterMode }),
    });
    return dispose;
  }, [focusMode, typewriterMode]);

  // Image paste → vault/assets/
  useEffect(() => {
    const host = editorScrollRef.current;
    if (!host) return;
    const dispose = installImagePaste(host, {
      vaultRoot: useAppStore.getState().vaultRoot,
      insert: (md) => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        // Insert plain text via execCommand-style fallback
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(md));
        sel.collapseToEnd();
        // Notify the editor onChange will fire via the standard input event
        // path; for source mode, CodeMirror picks it up natively.
      },
    });
    return dispose;
  }, [tab?.id]);

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
      if (saveTimerRef.current !== null)
        window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(performSave, SAVE_DEBOUNCE_MS);
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
    } catch {/*ignore*/}
  }, [setVaultFiles]);

  // Menu + vault listeners
  useEffect(() => {
    let unMenu: (() => void) | null = null;
    let unVault: (() => void) | null = null;
    listenMenu((id) => {
      switch (id) {
        case "new_file": newScratchTab(); break;
        case "open_file": handleOpenFile(); break;
        case "open_vault": handleOpenVault(); break;
        case "open_recent": setShowRecentOpen(true); break;
        case "close_tab": {
          const a = useAppStore.getState().activeTabId;
          if (a) closeTab(a);
          break;
        }
        case "save": performSave(); break;
        case "find_in_vault": setShowSearch(true); break;
        case "find_in_file": {
          const ev = new KeyboardEvent("keydown", { key: "f", metaKey: true });
          window.dispatchEvent(ev);
          break;
        }
        case "quick_open": setShowQuickOpen(true); break;
        case "command_palette": setShowCommandPalette(true); break;
        case "toggle_source_mode": toggleSourceMode(); break;
        case "toggle_sidebar": toggleSidebar(); break;
        case "toggle_outline": toggleOutline(); break;
        case "toggle_focus": toggleFocusMode(); break;
        case "toggle_typewriter": toggleTypewriterMode(); break;
        case "theme_light": setTheme("light"); break;
        case "theme_dark": setTheme("dark"); break;
        case "theme_sepia": setTheme("sepia"); break;
        case "export_html": handleExportHtml(); break;
        case "export_pdf": handleExportPdf(); break;
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

  // Keyboard shortcuts (mirror what the native menu offers, plus extras)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const k = e.key.toLowerCase();
      if (e.shiftKey && k === "p") {
        e.preventDefault();
        setShowCommandPalette(true);
      } else if (e.shiftKey && k === "f") {
        e.preventDefault();
        setShowSearch(true);
      } else if (e.shiftKey && k === "o") {
        e.preventDefault();
        handleOpenVault();
      } else if (k === "p") {
        e.preventDefault();
        setShowQuickOpen(true);
      } else if (k === "s") {
        e.preventDefault();
        if (saveTimerRef.current !== null) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        performSave();
      } else if (k === "/") {
        e.preventDefault();
        toggleSourceMode();
      } else if (k === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performSave]);

  const fileKey = tab?.id ?? "__none__";
  const initialValue = tab?.content ?? "";
  const isDark = theme === "dark";

  // Build commands for the palette
  const commands: Command[] = useMemo(() => {
    const base: Command[] = [
      { id: "new_file", label: "New File", shortcut: "⌘N", run: newScratchTab },
      { id: "open_file", label: "Open File…", shortcut: "⌘O", run: handleOpenFile },
      { id: "open_vault", label: "Open Vault…", shortcut: "⌘⇧O", run: handleOpenVault },
      { id: "save", label: "Save", shortcut: "⌘S", run: performSave },
      { id: "quick_open", label: "Quick Open", shortcut: "⌘P", run: () => setShowQuickOpen(true) },
      { id: "find_in_vault", label: "Find in Vault", shortcut: "⌘⇧F", run: () => setShowSearch(true) },
      { id: "toggle_source_mode", label: "Toggle Source Mode", shortcut: "⌘/", run: toggleSourceMode },
      { id: "toggle_sidebar", label: "Toggle Sidebar", shortcut: "⌘B", run: toggleSidebar },
      { id: "toggle_outline", label: "Toggle Outline", run: toggleOutline },
      { id: "toggle_focus", label: "Toggle Focus Mode", run: toggleFocusMode },
      { id: "toggle_typewriter", label: "Toggle Typewriter Mode", run: toggleTypewriterMode },
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

