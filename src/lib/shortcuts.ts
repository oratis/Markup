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
  | "saveAll"
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
  | "closeOtherTabs"
  | "reopenClosed"
  | "fmtBold"
  | "fmtItalic"
  | "fmtCode"
  | "fmtStrike"
  | "moveLineUp"
  | "moveLineDown"
  | "duplicateLine"
  | "toggleBlockquote"
  | "headingUp"
  | "headingDown"
  | "listBullet"
  | "listOrdered"
  | "listTask"
  | "zoomIn"
  | "zoomOut"
  | "zoomReset"
  | "insertLink"
  | "nextHeading"
  | "prevHeading"
  | "toggleOutline"
  | "moveTabLeft"
  | "moveTabRight"
  | "cycleTheme"
  | "showCheatsheet"
  | "insertHr";

export const defaults: Record<ShortcutId, string> = {
  save: "Mod+S",
  saveAs: "Mod+Shift+S",
  saveAll: "Mod+Alt+S",
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
  closeOtherTabs: "Mod+Alt+W",
  reopenClosed: "Mod+Shift+T",
  fmtBold: "Mod+B",
  fmtItalic: "Mod+I",
  fmtCode: "Mod+E",
  fmtStrike: "Mod+Shift+X",
  moveLineUp: "Alt+ArrowUp",
  moveLineDown: "Alt+ArrowDown",
  duplicateLine: "Shift+Alt+ArrowDown",
  toggleBlockquote: "Mod+'",
  headingUp: "Mod+Alt+ArrowUp",
  headingDown: "Mod+Alt+ArrowDown",
  listBullet: "Mod+Shift+8",
  listOrdered: "Mod+Shift+7",
  listTask: "Mod+Shift+9",
  zoomIn: "Mod+=",
  zoomOut: "Mod+-",
  zoomReset: "Mod+0",
  insertLink: "Mod+K",
  nextHeading: "Mod+Shift+J",
  prevHeading: "Mod+Shift+K",
  toggleOutline: "Mod+Alt+B",
  moveTabLeft: "Mod+Shift+Alt+ArrowLeft",
  moveTabRight: "Mod+Shift+Alt+ArrowRight",
  cycleTheme: "Mod+Alt+T",
  showCheatsheet: "Mod+Shift+/",
  insertHr: "Mod+Shift+-",
};

export const labels: Record<ShortcutId, string> = {
  save: "Save",
  saveAs: "Save As",
  saveAll: "Save All",
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
  closeOtherTabs: "Close Other Tabs",
  reopenClosed: "Reopen Last Closed Tab",
  fmtBold: "Bold",
  fmtItalic: "Italic",
  fmtCode: "Inline Code",
  fmtStrike: "Strikethrough",
  moveLineUp: "Move Line Up",
  moveLineDown: "Move Line Down",
  duplicateLine: "Duplicate Line",
  toggleBlockquote: "Toggle Blockquote",
  headingUp: "Promote Heading",
  headingDown: "Demote Heading",
  listBullet: "Toggle Bullet List",
  listOrdered: "Toggle Numbered List",
  listTask: "Toggle Task List",
  zoomIn: "Zoom In",
  zoomOut: "Zoom Out",
  zoomReset: "Reset Zoom",
  insertLink: "Insert Link",
  nextHeading: "Next Heading",
  prevHeading: "Previous Heading",
  toggleOutline: "Toggle Outline",
  moveTabLeft: "Move Active Tab Left",
  moveTabRight: "Move Active Tab Right",
  cycleTheme: "Cycle Theme",
  showCheatsheet: "Show Shortcuts Cheatsheet",
  insertHr: "Insert Horizontal Rule",
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

const CODE_PUNCTUATION: Record<string, string> = {
  BracketLeft: "[",
  BracketRight: "]",
  Minus: "-",
  Equal: "=",
  Slash: "/",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Backquote: "`",
};

/** The key name for a physical key (`KeyboardEvent.code`), or null if it
 * isn't one a shortcut binds. */
function keyNameFromCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  return CODE_PUNCTUATION[code] ?? null;
}

/**
 * Convert a KeyboardEvent → "Mod+Shift+X"-style string.
 * Returns null for events that aren't valid shortcuts (no modifiers, or
 * just a modifier).
 *
 * With Alt held, macOS composes the key through the Option layer before the
 * event reaches us: ⌥W arrives as `key: "∑"`, ⌥] as `"‘"`, ⌥E as a dead key.
 * None of those can ever equal a binding like "Mod+Alt+W", so for composed
 * (non-ASCII or dead) keys the name comes from the physical key instead.
 * Plain ASCII keys are left alone on purpose — AltGr layouts type real
 * characters through Ctrl+Alt and must keep doing so.
 */
export function eventToShortcut(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("Mod");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  const k = e.key;
  if (k === "Meta" || k === "Control" || k === "Shift" || k === "Alt") return null;
  if (parts.length === 0) return null;
  const composed = k === "Dead" || (k.length === 1 && k.charCodeAt(0) > 0x7f);
  const physical = e.altKey && composed ? keyNameFromCode(e.code ?? "") : null;
  // Normalise letters to uppercase, keep punctuation as-is.
  parts.push(physical ?? (k.length === 1 ? k.toUpperCase() : k));
  return parts.join("+");
}

/** Does this KeyboardEvent match the bound shortcut for `id`? */
export function matches(e: KeyboardEvent, id: ShortcutId): boolean {
  const want = getShortcut(id);
  const got = eventToShortcut(e);
  return got !== null && got === want;
}
