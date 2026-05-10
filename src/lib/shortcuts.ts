/**
 * App-wide shortcut model. Keys are stable command IDs; values are
 * shortcut strings using "Mod+Shift+X" syntax (Mod = ⌘ on macOS, Ctrl
 * elsewhere — for Markup specifically, always Cmd).
 *
 * `defaults` mirrors the `keydown` handler in App.tsx. Any override stored
 * via setShortcuts() takes precedence; the runtime handler reads
 * `currentBindings()` to dispatch.
 *
 * Native menu accelerators are baked into the macOS menu at build time
 * and are NOT overridden — that would require rebuilding the menu on
 * every change, and macOS standard accelerators are usually what users
 * expect anyway. Settings calls this out.
 */

export type ShortcutId =
  | "save"
  | "saveAs"
  | "openFile"
  | "openVault"
  | "quickOpen"
  | "findInFile"
  | "findInVault"
  | "commandPalette"
  | "toggleSourceMode"
  | "toggleSidebar"
  | "settings"
  | "nextTab"
  | "prevTab"
  | "reopenClosed";

export const defaults: Record<ShortcutId, string> = {
  save: "Mod+S",
  saveAs: "Mod+Shift+S",
  openFile: "Mod+O", // also handled by native menu
  openVault: "Mod+Shift+O",
  quickOpen: "Mod+P",
  findInFile: "Mod+F",
  findInVault: "Mod+Shift+F",
  commandPalette: "Mod+Shift+P",
  toggleSourceMode: "Mod+/",
  toggleSidebar: "Mod+B",
  settings: "Mod+,",
  nextTab: "Mod+Alt+]",
  prevTab: "Mod+Alt+[",
  reopenClosed: "Mod+Shift+T",
};

export const labels: Record<ShortcutId, string> = {
  save: "Save",
  saveAs: "Save As",
  openFile: "Open File",
  openVault: "Open Vault",
  quickOpen: "Quick Open",
  findInFile: "Find in File",
  findInVault: "Find in Vault",
  commandPalette: "Command Palette",
  toggleSourceMode: "Toggle Source Mode",
  toggleSidebar: "Toggle Sidebar",
  settings: "Settings",
  nextTab: "Next Tab",
  prevTab: "Previous Tab",
  reopenClosed: "Reopen Last Closed Tab",
};

const STORAGE_KEY = "markup.shortcuts";

let overrides: Partial<Record<ShortcutId, string>> = readStored();

const listeners = new Set<() => void>();

function readStored(): Partial<Record<ShortcutId, string>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /*ignore*/
  }
  return {};
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    /*ignore*/
  }
}

// Cached snapshot — useSyncExternalStore requires referential stability
// between calls when state hasn't changed; recomputed only after mutations.
let cachedSnapshot: Record<ShortcutId, string> = { ...defaults, ...overrides };

function recompute() {
  cachedSnapshot = { ...defaults, ...overrides };
}

export function currentBindings(): Record<ShortcutId, string> {
  return cachedSnapshot;
}

export function getShortcut(id: ShortcutId): string {
  return overrides[id] ?? defaults[id];
}

export function setShortcut(id: ShortcutId, value: string | null) {
  if (value === null || value === defaults[id]) {
    delete overrides[id];
  } else {
    overrides[id] = value;
  }
  recompute();
  persist();
  for (const l of listeners) l();
}

export function resetAll() {
  overrides = {};
  recompute();
  persist();
  for (const l of listeners) l();
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Convert a KeyboardEvent → "Mod+Shift+X"-style string.
 * Returns null for events that aren't valid shortcuts (no modifiers, or
 * just a modifier).
 */
export function eventToShortcut(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("Mod");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  const k = e.key;
  if (k === "Meta" || k === "Control" || k === "Shift" || k === "Alt") return null;
  if (parts.length === 0) return null;
  // Normalise letters to uppercase, keep punctuation as-is.
  parts.push(k.length === 1 ? k.toUpperCase() : k);
  return parts.join("+");
}

/** Does this KeyboardEvent match the bound shortcut for `id`? */
export function matches(e: KeyboardEvent, id: ShortcutId): boolean {
  const want = getShortcut(id);
  const got = eventToShortcut(e);
  return got !== null && got === want;
}
