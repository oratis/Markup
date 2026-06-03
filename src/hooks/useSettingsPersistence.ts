import { useEffect } from "react";
import { SETTINGS_KEY } from "../lib/ui-pref-keys";

export interface PersistedSettings {
  fontSize: number;
  proseMaxWidth: number;
  autosaveMs: number;
  imagePasteDir: string;
  exportTheme: string;
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
  vaultSort: string;
  dailyNotesFolder: string;
  dailyNotesFormat: string;
  dailyNotesTemplate: string;
  customCss: string;
}

/**
 * Pushes the typographic settings to CSS custom properties and persists the
 * full settings bag to localStorage whenever any field changes.
 *
 * Behaviour-preserving extraction of the inline "settings → CSS variables +
 * persist" effect from App.tsx.
 */
export function useSettingsPersistence(settings: PersistedSettings) {
  const { fontSize, proseMaxWidth } = settings;
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--markup-font-size", `${fontSize}px`);
    root.style.setProperty("--markup-prose-max-width", `${proseMaxWidth}px`);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /*ignore*/
    }
    // The settings object is rebuilt every render from individual store
    // selectors, so we depend on the primitive fields rather than the
    // object identity to avoid persisting on every unrelated render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.fontSize,
    settings.proseMaxWidth,
    settings.autosaveMs,
    settings.imagePasteDir,
    settings.exportTheme,
    settings.spellcheck,
    settings.lineWrap,
    settings.sidebarWidth,
    settings.outlineWidth,
    settings.saveOnBlur,
    settings.trimOnSave,
    settings.showLineNumbers,
    settings.wordCountGoal,
    settings.showToolbar,
    settings.showTabBar,
    settings.vaultSort,
    settings.dailyNotesFolder,
    settings.dailyNotesFormat,
    settings.dailyNotesTemplate,
    settings.customCss,
  ]);
}
