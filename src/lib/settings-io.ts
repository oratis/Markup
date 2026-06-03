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
      dailyNotesFolder: s.dailyNotesFolder,
      dailyNotesFormat: s.dailyNotesFormat,
      dailyNotesTemplate: s.dailyNotesTemplate,
      customCss: s.customCss,
    },
    null,
    2,
  );
}

/** Validate an unknown JSON-parsed value against the {@link Settings} shape.
 *  Silently drops fields whose type doesn't match — callers (the Import
 *  Settings command) feed the result into setSettings(), which clamps
 *  numerics. Returns null when the input itself isn't an object. */
export function parseSettings(input: unknown): Partial<Settings> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  const out: Partial<Settings> = {};
  const num = (k: keyof Settings) => {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v))
      (out as Record<string, unknown>)[k] = v;
  };
  const bool = (k: keyof Settings) => {
    const v = o[k];
    if (typeof v === "boolean") (out as Record<string, unknown>)[k] = v;
  };
  const str = (k: keyof Settings) => {
    const v = o[k];
    if (typeof v === "string") (out as Record<string, unknown>)[k] = v;
  };
  const enumVal = <K extends keyof Settings>(k: K, allowed: readonly Settings[K][]) => {
    const v = o[k];
    if (allowed.includes(v as Settings[K])) (out as Record<string, unknown>)[k] = v;
  };

  num("fontSize");
  num("proseMaxWidth");
  num("autosaveMs");
  str("imagePasteDir");
  enumVal("exportTheme", ["github", "plain", "tufte"] as const);
  bool("spellcheck");
  bool("lineWrap");
  num("sidebarWidth");
  num("outlineWidth");
  bool("saveOnBlur");
  bool("trimOnSave");
  bool("showLineNumbers");
  num("wordCountGoal");
  bool("showToolbar");
  bool("showTabBar");
  enumVal("vaultSort", ["name", "mtime"] as const);
  str("dailyNotesFolder");
  str("dailyNotesFormat");
  str("dailyNotesTemplate");
  str("customCss");

  return out;
}
