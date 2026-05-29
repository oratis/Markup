import { useEffect } from "react";
import { resolveTheme, subscribeSystemTheme } from "../lib/system-theme";
import {
  FOCUS_KEY,
  OUTLINE_KEY,
  RECENT_KEY,
  RECENT_VAULTS_KEY,
  SIDEBAR_KEY,
  SOURCE_MODE_KEY,
  THEME_KEY,
  TYPEWRITER_KEY,
} from "../lib/ui-pref-keys";
import type { Theme } from "../store";

/** Apply the resolved theme to the document root (light / dark / sepia). */
export function applyThemeToHtml(theme: Theme) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  root.classList.remove("theme-light", "theme-dark", "theme-sepia");
  root.classList.add(`theme-${resolved}`);
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

/** Toggle a class on the document root. */
export function applyClass(htmlClass: string, on: boolean) {
  document.documentElement.classList.toggle(htmlClass, on);
}

function setItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /*ignore*/
  }
}

interface UiPrefs {
  theme: Theme;
  sourceMode: boolean;
  sidebarOpen: boolean;
  outlineOpen: boolean;
  focusMode: boolean;
  typewriterMode: boolean;
  recentFiles: string[];
  recentVaults: string[];
}

/**
 * Persists UI preferences to localStorage and reflects view modes onto the
 * document root as state changes. Theme additionally subscribes to system
 * Light/Dark changes while in "auto" mode so the editor updates live.
 *
 * Behaviour-preserving extraction of the per-pref effects that previously
 * lived inline in App.tsx. The mount-time *restore* side stays in App; this
 * hook owns the write side only.
 */
export function useUiPrefPersistence(prefs: UiPrefs) {
  const {
    theme,
    sourceMode,
    sidebarOpen,
    outlineOpen,
    focusMode,
    typewriterMode,
    recentFiles,
    recentVaults,
  } = prefs;

  useEffect(() => {
    applyThemeToHtml(theme);
    setItem(THEME_KEY, theme);
    return subscribeSystemTheme(theme, () => applyThemeToHtml(theme));
  }, [theme]);

  useEffect(() => {
    setItem(SOURCE_MODE_KEY, String(sourceMode));
  }, [sourceMode]);

  useEffect(() => {
    setItem(SIDEBAR_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    setItem(OUTLINE_KEY, String(outlineOpen));
  }, [outlineOpen]);

  useEffect(() => {
    applyClass("focus-mode", focusMode);
    setItem(FOCUS_KEY, String(focusMode));
  }, [focusMode]);

  useEffect(() => {
    applyClass("typewriter-mode", typewriterMode);
    setItem(TYPEWRITER_KEY, String(typewriterMode));
  }, [typewriterMode]);

  useEffect(() => {
    setItem(RECENT_KEY, JSON.stringify(recentFiles));
    setItem(RECENT_VAULTS_KEY, JSON.stringify(recentVaults));
  }, [recentFiles, recentVaults]);
}
