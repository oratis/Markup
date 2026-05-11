import type { Settings } from "../store";

/** Serialise the persisted settings as pretty JSON. Used by both the
 * "Copy JSON" and "Download File" settings palette commands so they
 * can't drift out of sync when new settings are added. */
export function serializeSettings(s: Settings): string {
  return JSON.stringify(
    {
      fontSize: s.fontSize,
      proseMaxWidth: s.proseMaxWidth,
      autosaveMs: s.autosaveMs,
      imagePasteDir: s.imagePasteDir,
      exportTheme: s.exportTheme,
      spellcheck: s.spellcheck,
      lineWrap: s.lineWrap,
      sidebarWidth: s.sidebarWidth,
      outlineWidth: s.outlineWidth,
      saveOnBlur: s.saveOnBlur,
      trimOnSave: s.trimOnSave,
      showLineNumbers: s.showLineNumbers,
      wordCountGoal: s.wordCountGoal,
      showToolbar: s.showToolbar,
      showTabBar: s.showTabBar,
      vaultSort: s.vaultSort,
    },
    null,
    2,
  );
}
