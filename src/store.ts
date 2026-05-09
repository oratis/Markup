import { create } from "zustand";
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

  // tab ops
  openLoadedFile: (loaded: LoadedFile) => void;
  newScratchTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
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
}

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
      const tabs = state.tabs.filter((t) => t.id !== id);
      if (tabs.length === 0) {
        return {
          tabs: [welcomeTab()],
          activeTabId: `${SCRATCH_PREFIX}welcome`,
        };
      }
      const activeTabId =
        state.activeTabId === id
          ? tabs[Math.max(0, idx - 1)].id
          : state.activeTabId;
      return { tabs, activeTabId };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

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
        tabs: state.tabs.map((t) =>
          t.id === id ? { ...t, status, errorMessage } : t,
        ),
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
          t.id === id
            ? { ...t, id: path, path, name, mtimeMs, status: "saved" }
            : t,
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
}));

export function getActiveTab(state: AppState): Tab | null {
  if (!state.activeTabId) return null;
  return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
}
