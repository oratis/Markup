// localStorage keys for UI preferences. Shared between the mount-time
// restore effect in App.tsx and the persistence hooks in src/hooks so the
// read and write sides can never drift apart.
export const THEME_KEY = "markup.theme";
export const SOURCE_MODE_KEY = "markup.sourceMode";
export const SIDEBAR_KEY = "markup.sidebar";
export const OUTLINE_KEY = "markup.outline";
export const FOCUS_KEY = "markup.focus";
export const TYPEWRITER_KEY = "markup.typewriter";
export const RECENT_KEY = "markup.recentFiles";
export const RECENT_VAULTS_KEY = "markup.recentVaults";
export const SETTINGS_KEY = "markup.settings";
