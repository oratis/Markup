import { useCallback, useEffect, useRef, useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { TabBar } from "./components/TabBar";
import { MarkupEditor } from "./components/Editor";
import { FileTree } from "./components/FileTree";
import { StatusBar } from "./components/StatusBar";
import { QuickOpen } from "./components/QuickOpen";
import { SearchPanel } from "./components/SearchPanel";
import { getActiveTab, useAppStore, type Theme } from "./store";
import {
  listenMenu,
  listenVaultChanged,
  listVaultFiles,
  openFileDialog,
  openVault,
  pickVault,
  writeFile,
} from "./lib/tauri";

const SAVE_DEBOUNCE_MS = 300;
const THEME_KEY = "markup.theme";
const SOURCE_MODE_KEY = "markup.sourceMode";
const SIDEBAR_KEY = "markup.sidebar";

function applyThemeToHtml(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark", "theme-sepia");
  root.classList.add(`theme-${theme}`);
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function App() {
  const tab = useAppStore(getActiveTab);
  const sourceMode = useAppStore((s) => s.sourceMode);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const theme = useAppStore((s) => s.theme);

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
  const setTheme = useAppStore((s) => s.setTheme);

  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const saveTimerRef = useRef<number | null>(null);

  // Restore prefs on mount
  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY) as Theme | null;
      if (t === "light" || t === "dark" || t === "sepia") setTheme(t);
      const sm = localStorage.getItem(SOURCE_MODE_KEY);
      if (sm === "true") setSourceMode(true);
      const sb = localStorage.getItem(SIDEBAR_KEY);
      if (sb === "true") toggleSidebar();
    } catch {
      /* ignore */
    }
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
    try {
      localStorage.setItem(SOURCE_MODE_KEY, String(sourceMode));
    } catch {/*ignore*/}
  }, [sourceMode]);
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen));
    } catch {/*ignore*/}
  }, [sidebarOpen]);

  const performSave = useCallback(async () => {
    const state = useAppStore.getState();
    const t = state.activeTabId
      ? state.tabs.find((x) => x.id === state.activeTabId)
      : null;
    if (!t || !t.path) return; // can't save scratch buffers without Save As
    setActiveStatus("saving");
    try {
      const newMtime = await writeFile(t.path, t.content, t.mtimeMs);
      setActiveMtime(newMtime);
      setActiveStatus("saved");
    } catch (err) {
      console.error("write_file failed", err);
      setActiveStatus("error", String(err));
    }
  }, [setActiveStatus, setActiveMtime]);

  const handleEditorChange = useCallback(
    (md: string) => {
      updateActiveContent(md);
      const t = useAppStore.getState();
      const active = t.activeTabId
        ? t.tabs.find((x) => x.id === t.activeTabId)
        : null;
      if (!active?.path) return;
      if (saveTimerRef.current !== null)
        window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(performSave, SAVE_DEBOUNCE_MS);
    },
    [updateActiveContent, performSave],
  );

  // ⌘S, ⌘W, ⌘N, ⌘O, ⌘P, ⌘⇧F, ⌘/, ⌘B  via keyboard fallback (menu also fires these via menu-event)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const k = e.key.toLowerCase();
      if (e.shiftKey && k === "p") {
        e.preventDefault();
        // Reserved for command palette (not implemented in MVP)
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

  // Menu events from Tauri's native menu
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
    } catch {/*ignore*/}
  }, [setVaultFiles]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let unlistenVault: (() => void) | null = null;

    listenMenu((id) => {
      switch (id) {
        case "new_file":
          newScratchTab();
          break;
        case "open_file":
          handleOpenFile();
          break;
        case "open_vault":
          handleOpenVault();
          break;
        case "close_tab": {
          const a = useAppStore.getState().activeTabId;
          if (a) closeTab(a);
          break;
        }
        case "save":
          performSave();
          break;
        case "find_in_vault":
          setShowSearch(true);
          break;
        case "quick_open":
          setShowQuickOpen(true);
          break;
        case "toggle_source_mode":
          toggleSourceMode();
          break;
        case "toggle_sidebar":
          toggleSidebar();
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
      }
    }).then((u) => (unlisten = u));

    listenVaultChanged(() => {
      refreshVault();
    }).then((u) => (unlistenVault = u));

    return () => {
      unlisten?.();
      unlistenVault?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fileKey = tab?.id ?? "__none__";
  const initialValue = tab?.content ?? "";
  const isDark = theme === "dark";

  return (
    <div className="flex flex-col h-full">
      <Toolbar />
      <TabBar />
      <main className="flex-1 min-h-0 flex">
        {sidebarOpen && (
          <aside className="w-[260px] shrink-0 border-r border-black/5 dark:border-white/10 flex flex-col">
            <FileTree />
          </aside>
        )}
        <section className="flex-1 min-w-0 overflow-auto">
          <MarkupEditor
            fileKey={fileKey}
            initialValue={initialValue}
            sourceMode={sourceMode}
            isDark={isDark}
            onChange={handleEditorChange}
          />
        </section>
      </main>
      <StatusBar />
      {showQuickOpen && <QuickOpen onClose={() => setShowQuickOpen(false)} />}
      {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}
    </div>
  );
}

// Convert Rust snake_case fields to TS camelCase used in the store.
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
