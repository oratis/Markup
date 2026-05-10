/**
 * Persisted "open tabs" session — the list of path-backed tabs that
 * were open when the window was last running, plus the active tab's
 * path. Restored on the next launch so the user comes back to exactly
 * what they were working on.
 *
 * Scratch buffers (no path) are never persisted — they don't survive
 * relaunch on their own.
 */
const KEY = "markup.session";

interface SessionPayload {
  open: string[];
  active: string | null;
}

export function readSession(): SessionPayload {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { open: [], active: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { open: [], active: null };
    const open = Array.isArray(parsed.open)
      ? parsed.open.filter((x: unknown): x is string => typeof x === "string")
      : [];
    const active =
      typeof parsed.active === "string" && parsed.active.length > 0
        ? parsed.active
        : null;
    return { open, active };
  } catch {
    return { open: [], active: null };
  }
}

export function writeSession(payload: SessionPayload): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/** For tests. */
export function _resetSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
