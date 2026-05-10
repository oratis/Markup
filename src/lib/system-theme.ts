import type { ResolvedTheme, Theme } from "../store";

/** Cycle order for the "Cycle Theme" command — light → dark → sepia → auto. */
const CYCLE: readonly Theme[] = ["light", "dark", "sepia", "auto"] as const;

/** Return the next theme in the cycle (wraps around). */
export function nextTheme(theme: Theme): Theme {
  const i = CYCLE.indexOf(theme);
  return CYCLE[(i + 1) % CYCLE.length] ?? "light";
}

/** Resolve a Theme value (which may be "auto") to the concrete theme that
 *  the editor applies right now. */
export function resolveTheme(t: Theme): ResolvedTheme {
  if (t !== "auto") return t;
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Subscribe to system color-scheme changes. Calls `onChange(resolved)` only
 * when `theme` is "auto"; updates as the user flips Light/Dark in macOS
 * System Settings. Returns a disposer.
 */
export function subscribeSystemTheme(
  theme: Theme,
  onChange: (resolved: ResolvedTheme) => void,
): () => void {
  if (theme !== "auto" || typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange(mql.matches ? "dark" : "light");
  // Most browsers expose addEventListener("change"); some older only addListener.
  if (mql.addEventListener) {
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }
  // Fallback for older WebKit that only supports the deprecated API.
  // biome-ignore lint/suspicious/noExplicitAny: optional legacy API
  (mql as any).addListener?.(handler);
  return () => {
    // biome-ignore lint/suspicious/noExplicitAny: optional legacy API
    (mql as any).removeListener?.(handler);
  };
}
