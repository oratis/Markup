import { create } from "zustand";
import { t } from "./lib/i18n";
import type { LoadedFile } from "./lib/types";

export type SaveStatus = "saved" | "dirty" | "saving" | "error";
export type Theme = "light" | "dark" | "sepia";

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

  // settings
  fontSize: number; // base font size px (12-22)
  proseMaxWidth: number; // px (560-980); the prose column width
  autosaveMs: number; // 0 = autosave disabled
  imagePasteDir: string; // relative to vault root
  exportTheme: "github" | "plain" | "tufte";

  // tab ops
  openLoadedFile: (loaded: LoadedFile) => void;
  newScratchTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  reorderTab: (fromId: string, toId: string) => void;
  updateActiveContent: (content: string) => void;
  setActiveStatus: (status: SaveStatus, errorMessage?: string | null) => void;
  setActiveMtime: (mtimeMs: number) => void;
  setActivePathAndName: (path: string, name: string, mtimeMs: number) => void;

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

  // settings
  setSettings: (patch: Partial<Settings>) => void;
}

export interface Settings {
  fontSize: number;
  proseMaxWidth: number;
  autosaveMs: number;
  imagePasteDir: string;
  exportTheme: "github" | "plain" | "tufte";
}

export const DEFAULT_SETTINGS: Settings = {
  fontSize: 16,
  proseMaxWidth: 720,
  autosaveMs: 300,
  imagePasteDir: "assets",
  exportTheme: "github",
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

  fontSize: DEFAULT_SETTINGS.fontSize,
  proseMaxWidth: DEFAULT_SETTINGS.proseMaxWidth,
  autosaveMs: DEFAULT_SETTINGS.autosaveMs,
  imagePasteDir: DEFAULT_SETTINGS.imagePasteDir,
  exportTheme: DEFAULT_SETTINGS.exportTheme,

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
      if (tabs.length === 0) {
        return {
          tabs: [welcomeTab()],
          activeTabId: `${SCRATCH_PREFIX}welcome`,
        };
      }
      const activeTabId =
        state.activeTabId === id ? tabs[Math.max(0, idx - 1)].id : state.activeTabId;
      return { tabs, activeTabId };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  reorderTab: (fromId, toId) =>
    set((state) => {
      if (fromId === toId) return state;
      const tabs = [...state.tabs];
      const fromIdx = tabs.findIndex((t) => t.id === fromId);
      const toIdx = tabs.findIndex((t) => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return state;
      const [moved] = tabs.splice(fromIdx, 1);
      tabs.splice(toIdx, 0, moved);
      return { tabs };
    }),

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
      return {
        fontSize,
        proseMaxWidth,
        autosaveMs,
        imagePasteDir: imagePasteDir || "assets",
        exportTheme,
      };
    }),

  pushRecentFile: (path) =>
    set((state) => {
      const next = [path, ...state.recentFiles.filter((p) => p !== path)].slice(0, 20);
      return { recentFiles: next };
    }),
  setRecentFiles: (paths) => set({ recentFiles: paths }),
}));

export function getActiveTab(state: AppState): Tab | null {
  if (!state.activeTabId) return null;
  return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
