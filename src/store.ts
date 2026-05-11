import { create } from "zustand";
import { t } from "./lib/i18n";
import type { LoadedFile } from "./lib/types";

export type SaveStatus = "saved" | "dirty" | "saving" | "error";
/** "auto" resolves to light or dark via prefers-color-scheme. */
export type Theme = "light" | "dark" | "sepia" | "auto";
export type ResolvedTheme = "light" | "dark" | "sepia";

export interface Tab {
  /** Stable key for React lists. Synthetic for unsaved/welcome tabs. */
  id: string;
  /** Absolute path on disk; null for unsaved buffers. */
  path: string | null;
  /** Display name (filename or "Untitled"). */
  name: string;
  /** In-memory content. The on-disk version may be older. */
  content: string;
  /** Last known on-disk mtime in ms; null for unsaved buffers. */
  mtimeMs: number | null;
  status: SaveStatus;
  errorMessage: string | null;
  /** Pinned tabs render before unpinned ones, survive Close All / Close
   * Others / Close to the Right unless explicitly unpinned. */
  pinned?: boolean;
}

export interface VaultFile {
  path: string;
  relPath: string;
  name: string;
  mtimeMs: number;
  size: number;
}

interface AppState {
  tabs: Tab[];
  activeTabId: string | null;
  vaultRoot: string | null;
  vaultFiles: VaultFile[];
  sourceMode: boolean;
  theme: Theme;
  sidebarOpen: boolean;
  outlineOpen: boolean;
  focusMode: boolean;
  typewriterMode: boolean;
  recentFiles: string[];
  /** LIFO stack of recently closed file paths — latest first. Capped at
   * RECENTLY_CLOSED_MAX. Survives only the current session; not persisted. */
  recentlyClosed: string[];
  /** MRU list of vault root paths the user has opened. */
  recentVaults: string[];

  // settings
  fontSize: number; // base font size px (12-22)
  proseMaxWidth: number; // px (560-980); the prose column width
  autosaveMs: number; // 0 = autosave disabled
  imagePasteDir: string; // relative to vault root
  exportTheme: "github" | "plain" | "tufte";
  spellcheck: boolean;
  /** Source-mode soft line wrapping. When false, long lines scroll
   * horizontally instead of wrapping. */
  lineWrap: boolean;
  /** Width of the file-tree sidebar in px (when open). */
  sidebarWidth: number;
  /** Width of the outline panel in px (when open). */
  outlineWidth: number;
  /** Trigger Save All silently when the window loses focus. */
  saveOnBlur: boolean;
  /** Strip trailing whitespace from each line when saving. */
  trimOnSave: boolean;
  /** Show CM6 line numbers in source mode. */
  showLineNumbers: boolean;
  /** Word-count goal for the active doc; status bar shows progress. 0 = off. */
  wordCountGoal: number;
  /** Show the top toolbar. Off = zen mode. */
  showToolbar: boolean;
  /** Show the tab strip. Off hides it (single-doc focus). */
  showTabBar: boolean;
  /** Sidebar file tree sort order. */
  vaultSort: "name" | "mtime";

  // tab ops
  openLoadedFile: (loaded: LoadedFile) => void;
  newScratchTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  reorderTab: (fromId: string, toId: string) => void;
  closeOtherTabs: (id: string) => void;
  closeTabsToRight: (id: string) => void;
  closeAllTabs: () => void;
  toggleTabPinned: (id: string) => void;
  activateNextTab: () => void;
  activatePrevTab: () => void;
  /** Activate the tab at the given 0-based index. No-op when out of range. */
  activateTabAt: (index: number) => void;
  /** Swap the active tab with its immediate neighbour. Pinned/unpinned
   * boundary is respected — never crosses it. */
  moveActiveTab: (direction: "left" | "right") => void;
  /** Move the active tab to the first or last slot inside its
   * pinned-group. */
  moveActiveTabToEdge: (edge: "first" | "last") => void;
  /** Pops the latest entry from `recentlyClosed` and returns its path
   * (caller is responsible for reading + opening it). Returns null when
   * the stack is empty. */
  popRecentlyClosed: () => string | null;
  updateActiveContent: (content: string) => void;
  setActiveStatus: (status: SaveStatus, errorMessage?: string | null) => void;
  setActiveMtime: (mtimeMs: number) => void;
  setActivePathAndName: (path: string, name: string, mtimeMs: number) => void;
  /** Replace active tab content + mtime in one shot, marking it saved.
   * Used when reloading from disk (so the content swap doesn't flip the
   * dirty flag the way `updateActiveContent` would). */
  reloadActiveFromDisk: (content: string, mtimeMs: number) => void;

  // vault
  setVault: (root: string | null, files: VaultFile[]) => void;
  setVaultFiles: (files: VaultFile[]) => void;

  // view
  toggleSourceMode: () => void;
  setSourceMode: (b: boolean) => void;
  setTheme: (t: Theme) => void;
  toggleSidebar: () => void;
  toggleOutline: () => void;
  toggleFocusMode: () => void;
  toggleTypewriterMode: () => void;

  // recent files
  pushRecentFile: (path: string) => void;
  setRecentFiles: (paths: string[]) => void;
  pushRecentVault: (root: string) => void;
  setRecentVaults: (roots: string[]) => void;

  // settings
  setSettings: (patch: Partial<Settings>) => void;
}

export interface Settings {
  fontSize: number;
  proseMaxWidth: number;
  autosaveMs: number;
  imagePasteDir: string;
  exportTheme: "github" | "plain" | "tufte";
  spellcheck: boolean;
  lineWrap: boolean;
  sidebarWidth: number;
  outlineWidth: number;
  saveOnBlur: boolean;
  trimOnSave: boolean;
  showLineNumbers: boolean;
  wordCountGoal: number;
  showToolbar: boolean;
  showTabBar: boolean;
  vaultSort: "name" | "mtime";
}

export const DEFAULT_SETTINGS: Settings = {
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
};

const SCRATCH_PREFIX = "scratch:";

const WELCOME_MD = `# Welcome to Markup

A high-performance Markdown editor for macOS.

## Try it out

- Type some **markdown**
- Use \`Cmd+O\` to open a \`.md\` file, or \`Cmd+Shift+O\` for a vault
- Press \`Cmd+/\` to switch between WYSIWYG and source mode
- Edits autosave 300ms after you stop typing

### Math (KaTeX)

Inline: $a^2 + b^2 = c^2$

Block:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$

### Diagram (Mermaid)

\`\`\`mermaid
graph LR
    A[Open file] --> B[Edit]
    B --> C{Dirty?}
    C -->|Yes| D[Autosave]
    C -->|No| E[Idle]
\`\`\`

### Code

\`\`\`ts
function hello(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

> Markup is **local-first**: every \`.md\` you edit is just a plain file you can
> open with any other editor.
`;

let scratchCounter = 0;

const RECENTLY_CLOSED_MAX = 10;

/** Add closed paths to the recently-closed stack, deduped + capped. */
function pushClosed(stack: string[], paths: Array<string | null | undefined>): string[] {
  const real = paths.filter((p): p is string => Boolean(p));
  if (real.length === 0) return stack;
  // Newest entries lead; drop earlier instances of the same path.
  const seen = new Set(real);
  const next = [...real, ...stack.filter((p) => !seen.has(p))];
  return next.slice(0, RECENTLY_CLOSED_MAX);
}

function welcomeTab(): Tab {
  return {
    id: `${SCRATCH_PREFIX}welcome`,
    path: null,
    name: "Welcome",
    content: WELCOME_MD,
    mtimeMs: null,
    status: "saved",
    errorMessage: null,
  };
}

export const useAppStore = create<AppState>((set) => ({
  tabs: [welcomeTab()],
  activeTabId: `${SCRATCH_PREFIX}welcome`,
  vaultRoot: null,
  vaultFiles: [],
  sourceMode: false,
  theme: "light",
  sidebarOpen: false,
  outlineOpen: false,
  focusMode: false,
  typewriterMode: false,
  recentFiles: [],
  recentlyClosed: [],
  recentVaults: [],

  fontSize: DEFAULT_SETTINGS.fontSize,
  proseMaxWidth: DEFAULT_SETTINGS.proseMaxWidth,
  autosaveMs: DEFAULT_SETTINGS.autosaveMs,
  imagePasteDir: DEFAULT_SETTINGS.imagePasteDir,
  exportTheme: DEFAULT_SETTINGS.exportTheme,
  spellcheck: DEFAULT_SETTINGS.spellcheck,
  lineWrap: DEFAULT_SETTINGS.lineWrap,
  sidebarWidth: DEFAULT_SETTINGS.sidebarWidth,
  outlineWidth: DEFAULT_SETTINGS.outlineWidth,
  saveOnBlur: DEFAULT_SETTINGS.saveOnBlur,
  trimOnSave: DEFAULT_SETTINGS.trimOnSave,
  showLineNumbers: DEFAULT_SETTINGS.showLineNumbers,
  wordCountGoal: DEFAULT_SETTINGS.wordCountGoal,
  showToolbar: DEFAULT_SETTINGS.showToolbar,
  showTabBar: DEFAULT_SETTINGS.showTabBar,
  vaultSort: DEFAULT_SETTINGS.vaultSort,

  openLoadedFile: (loaded) =>
    set((state) => {
      const id = loaded.path;
      const existing = state.tabs.find((t) => t.id === id);
      if (existing) return { activeTabId: id };
      const tab: Tab = {
        id,
        path: loaded.path,
        name: loaded.path.split("/").pop() ?? loaded.path,
        content: loaded.content,
        mtimeMs: loaded.mtime_ms,
        status: "saved",
        errorMessage: null,
      };
      // Drop the welcome scratch tab if it's still untouched & only tab
      const keep = state.tabs.filter(
        (t) => t.id !== `${SCRATCH_PREFIX}welcome` || state.tabs.length > 1,
      );
      return { tabs: [...keep, tab], activeTabId: id };
    }),

  newScratchTab: () =>
    set((state) => {
      scratchCounter += 1;
      const id = `${SCRATCH_PREFIX}new-${scratchCounter}`;
      const tab: Tab = {
        id,
        path: null,
        name: "Untitled",
        content: "",
        mtimeMs: null,
        status: "saved",
        errorMessage: null,
      };
      return { tabs: [...state.tabs, tab], activeTabId: id };
    }),

  closeTab: (id) =>
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id);
      if (idx < 0) return state;
      const target = state.tabs[idx];
      // Confirm if dirty (and we're closing a real file, not a scratch buffer)
      if (target.status === "dirty" && target.path) {
        const ok = window.confirm(t("tab.confirmClose", target.name));
        if (!ok) return state;
      }
      const tabs = state.tabs.filter((t) => t.id !== id);
      const recentlyClosed = pushClosed(state.recentlyClosed, [target.path]);
      if (tabs.length === 0) {
        return {
          tabs: [welcomeTab()],
          activeTabId: `${SCRATCH_PREFIX}welcome`,
          recentlyClosed,
        };
      }
      const activeTabId =
        state.activeTabId === id ? tabs[Math.max(0, idx - 1)].id : state.activeTabId;
      return { tabs, activeTabId, recentlyClosed };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  reorderTab: (fromId, toId) =>
    set((state) => {
      if (fromId === toId) return state;
      const tabs = [...state.tabs];
      const fromIdx = tabs.findIndex((t) => t.id === fromId);
      const toIdx = tabs.findIndex((t) => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return state;
      // Don't allow drag-reorder to mix pinned and unpinned groups —
      // pinned must stay first. Otherwise the reorder is silently dropped.
      if (Boolean(tabs[fromIdx].pinned) !== Boolean(tabs[toIdx].pinned)) {
        return state;
      }
      const [moved] = tabs.splice(fromIdx, 1);
      tabs.splice(toIdx, 0, moved);
      return { tabs };
    }),

  closeOtherTabs: (id) =>
    set((state) => {
      const keep = state.tabs.find((t) => t.id === id);
      if (!keep) return state;
      // Pinned tabs survive "close others" — they're explicitly anchored.
      const closed = state.tabs
        .filter((t) => t.id !== id && !t.pinned)
        .map((t) => t.path);
      const tabs = state.tabs.filter((t) => t.id === id || t.pinned);
      return {
        tabs,
        activeTabId: keep.id,
        recentlyClosed: pushClosed(state.recentlyClosed, closed),
      };
    }),

  closeTabsToRight: (id) =>
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id);
      if (idx < 0) return state;
      const head = state.tabs.slice(0, idx + 1);
      // Keep pinned tabs that lived to the right of `id` so the user
      // doesn't lose their anchored ones via this gesture.
      const right = state.tabs.slice(idx + 1);
      const pinnedRight = right.filter((t) => t.pinned);
      const closed = right.filter((t) => !t.pinned).map((t) => t.path);
      const tabs = [...head, ...pinnedRight];
      const activeStillVisible = tabs.some((t) => t.id === state.activeTabId);
      return {
        tabs,
        activeTabId: activeStillVisible ? state.activeTabId : id,
        recentlyClosed: pushClosed(state.recentlyClosed, closed),
      };
    }),

  closeAllTabs: () =>
    set((state) => {
      const dirty = state.tabs.find((x) => x.status === "dirty" && x.path && !x.pinned);
      if (dirty) {
        const ok = window.confirm(t("tab.confirmClose", dirty.name));
        if (!ok) return state;
      }
      const pinned = state.tabs.filter((t) => t.pinned);
      const closed = state.tabs.filter((t) => !t.pinned).map((t) => t.path);
      const recentlyClosed = pushClosed(state.recentlyClosed, closed);
      if (pinned.length === 0) {
        return {
          tabs: [welcomeTab()],
          activeTabId: `${SCRATCH_PREFIX}welcome`,
          recentlyClosed,
        };
      }
      const stillActive = pinned.some((t) => t.id === state.activeTabId);
      return {
        tabs: pinned,
        activeTabId: stillActive ? state.activeTabId : pinned[0].id,
        recentlyClosed,
      };
    }),

  toggleTabPinned: (id) =>
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id);
      if (idx < 0) return state;
      const target = state.tabs[idx];
      const next: Tab = { ...target, pinned: !target.pinned };
      // Re-sort so pinned tabs lead while preserving relative order.
      const others = state.tabs.filter((t) => t.id !== id);
      const tabs = next.pinned
        ? [...others.filter((t) => t.pinned), next, ...others.filter((t) => !t.pinned)]
        : [...others.filter((t) => t.pinned), ...others.filter((t) => !t.pinned), next];
      return { tabs };
    }),

  activateNextTab: () =>
    set((state) => {
      if (state.tabs.length < 2 || !state.activeTabId) return state;
      const i = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (i < 0) return state;
      const next = state.tabs[(i + 1) % state.tabs.length];
      return { activeTabId: next.id };
    }),

  activatePrevTab: () =>
    set((state) => {
      if (state.tabs.length < 2 || !state.activeTabId) return state;
      const i = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (i < 0) return state;
      const prev = state.tabs[(i - 1 + state.tabs.length) % state.tabs.length];
      return { activeTabId: prev.id };
    }),

  activateTabAt: (index) =>
    set((state) => {
      if (index < 0 || index >= state.tabs.length) return state;
      return { activeTabId: state.tabs[index].id };
    }),

  moveActiveTab: (direction) =>
    set((state) => {
      if (state.tabs.length < 2 || !state.activeTabId) return state;
      const i = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (i < 0) return state;
      const j = direction === "left" ? i - 1 : i + 1;
      if (j < 0 || j >= state.tabs.length) return state;
      // Don't let drag-reorder mix pinned and unpinned groups.
      if (Boolean(state.tabs[i].pinned) !== Boolean(state.tabs[j].pinned)) return state;
      const tabs = [...state.tabs];
      [tabs[i], tabs[j]] = [tabs[j], tabs[i]];
      return { tabs };
    }),

  moveActiveTabToEdge: (edge) =>
    set((state) => {
      if (state.tabs.length < 2 || !state.activeTabId) return state;
      const i = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (i < 0) return state;
      // Target the first / last slot in the same pinned-group as the
      // moving tab so the pinned/unpinned boundary stays respected.
      const isPinned = Boolean(state.tabs[i].pinned);
      const indicesInGroup = state.tabs
        .map((t, idx) => (Boolean(t.pinned) === isPinned ? idx : -1))
        .filter((idx) => idx >= 0);
      const j =
        edge === "first" ? indicesInGroup[0] : indicesInGroup[indicesInGroup.length - 1];
      if (j === i) return state;
      const tabs = [...state.tabs];
      const [moved] = tabs.splice(i, 1);
      tabs.splice(j, 0, moved);
      return { tabs };
    }),

  popRecentlyClosed: () => {
    let popped: string | null = null;
    set((state) => {
      if (state.recentlyClosed.length === 0) return state;
      const [head, ...rest] = state.recentlyClosed;
      popped = head;
      return { recentlyClosed: rest };
    });
    return popped;
  },

  updateActiveContent: (content) =>
    set((state) => {
      const id = state.activeTabId;
      if (!id) return state;
      return {
        tabs: state.tabs.map((t) =>
          t.id === id
            ? {
                ...t,
                content,
                status: t.path ? "dirty" : t.status,
              }
            : t,
        ),
      };
    }),

  setActiveStatus: (status, errorMessage = null) =>
    set((state) => {
      const id = state.activeTabId;
      if (!id) return state;
      return {
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, status, errorMessage } : t)),
      };
    }),

  setActiveMtime: (mtimeMs) =>
    set((state) => {
      const id = state.activeTabId;
      if (!id) return state;
      return {
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, mtimeMs } : t)),
      };
    }),

  setActivePathAndName: (path, name, mtimeMs) =>
    set((state) => {
      const id = state.activeTabId;
      if (!id) return state;
      return {
        tabs: state.tabs.map((t) =>
          t.id === id ? { ...t, id: path, path, name, mtimeMs, status: "saved" } : t,
        ),
        activeTabId: path,
      };
    }),

  reloadActiveFromDisk: (content, mtimeMs) =>
    set((state) => {
      const id = state.activeTabId;
      if (!id) return state;
      return {
        tabs: state.tabs.map((t) =>
          t.id === id
            ? { ...t, content, mtimeMs, status: "saved", errorMessage: null }
            : t,
        ),
      };
    }),

  setVault: (root, files) => set({ vaultRoot: root, vaultFiles: files }),
  setVaultFiles: (files) => set({ vaultFiles: files }),

  toggleSourceMode: () => set((s) => ({ sourceMode: !s.sourceMode })),
  setSourceMode: (b) => set({ sourceMode: b }),
  setTheme: (t) => set({ theme: t }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleOutline: () => set((s) => ({ outlineOpen: !s.outlineOpen })),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  toggleTypewriterMode: () => set((s) => ({ typewriterMode: !s.typewriterMode })),

  setSettings: (patch) =>
    set((state) => {
      const fontSize = clamp(patch.fontSize ?? state.fontSize, 11, 24);
      const proseMaxWidth = clamp(patch.proseMaxWidth ?? state.proseMaxWidth, 480, 1200);
      const autosaveMs = clamp(patch.autosaveMs ?? state.autosaveMs, 0, 5000);
      const imagePasteDir = (patch.imagePasteDir ?? state.imagePasteDir).trim();
      const exportTheme = patch.exportTheme ?? state.exportTheme;
      const spellcheck = patch.spellcheck ?? state.spellcheck;
      const lineWrap = patch.lineWrap ?? state.lineWrap;
      const sidebarWidth = clamp(patch.sidebarWidth ?? state.sidebarWidth, 160, 600);
      const outlineWidth = clamp(patch.outlineWidth ?? state.outlineWidth, 160, 600);
      const saveOnBlur = patch.saveOnBlur ?? state.saveOnBlur;
      const trimOnSave = patch.trimOnSave ?? state.trimOnSave;
      const showLineNumbers = patch.showLineNumbers ?? state.showLineNumbers;
      const wordCountGoal = clamp(patch.wordCountGoal ?? state.wordCountGoal, 0, 100_000);
      const showToolbar = patch.showToolbar ?? state.showToolbar;
      const showTabBar = patch.showTabBar ?? state.showTabBar;
      const vaultSort = patch.vaultSort ?? state.vaultSort;
      return {
        fontSize,
        proseMaxWidth,
        autosaveMs,
        imagePasteDir: imagePasteDir || "assets",
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
      };
    }),

  pushRecentFile: (path) =>
    set((state) => {
      const next = [path, ...state.recentFiles.filter((p) => p !== path)].slice(0, 50);
      return { recentFiles: next };
    }),
  setRecentFiles: (paths) => set({ recentFiles: paths }),

  pushRecentVault: (root) =>
    set((state) => {
      const next = [root, ...state.recentVaults.filter((p) => p !== root)].slice(0, 10);
      return { recentVaults: next };
    }),
  setRecentVaults: (roots) => set({ recentVaults: roots }),
}));

export function getActiveTab(state: AppState): Tab | null {
  if (!state.activeTabId) return null;
  return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
