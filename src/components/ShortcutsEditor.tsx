import { useState, useSyncExternalStore } from "react";
import { useT } from "../lib/i18n";
import {
  type ShortcutId,
  currentBindings,
  defaults,
  eventToShortcut,
  labels,
  resetAll,
  setShortcut,
  subscribe,
} from "../lib/shortcuts";

const IDS: ShortcutId[] = [
  "save",
  "saveAs",
  "openFile",
  "openVault",
  "quickOpen",
  "findInFile",
  "findInVault",
  "commandPalette",
  "toggleSourceMode",
  "toggleSidebar",
  "settings",
];

function prettify(s: string): string {
  return s
    .replace(/Mod/g, "⌘")
    .replace(/Shift/g, "⇧")
    .replace(/Alt/g, "⌥")
    .replace(/\+/g, "");
}

export function ShortcutsEditor() {
  const t = useT();
  const bindings = useSyncExternalStore(subscribe, currentBindings, currentBindings);
  const [recording, setRecording] = useState<ShortcutId | null>(null);

  function startRecord(id: ShortcutId) {
    setRecording(id);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
        return;
      }
      const acc = eventToShortcut(e);
      if (!acc) return; // wait for a non-modifier key
      e.preventDefault();
      e.stopPropagation();
      setShortcut(id, acc);
      cleanup();
    }
    function cleanup() {
      window.removeEventListener("keydown", onKey, true);
      setRecording(null);
    }
    window.addEventListener("keydown", onKey, true);
  }

  return (
    <div className="border-t border-black/5 dark:border-white/10 pt-4 mt-4">
      <div className="text-[12px] font-medium mb-1">{t("settings.shortcuts")}</div>
      <div className="text-[10px] opacity-60 mb-2">{t("settings.shortcutsHint")}</div>
      <div className="space-y-0.5 max-h-[180px] overflow-auto no-scrollbar text-[12px]">
        {IDS.map((id) => {
          const overridden = bindings[id] !== defaults[id];
          return (
            <div key={id} className="flex items-center gap-3 py-1">
              <div className="flex-1 truncate opacity-80">{labels[id]}</div>
              <button
                onClick={() => startRecord(id)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                  recording === id
                    ? "border-blue-500 text-blue-500 animate-pulse"
                    : "border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {recording === id
                  ? t("settings.shortcutsRecord")
                  : prettify(bindings[id])}
              </button>
              {overridden && (
                <button
                  onClick={() => setShortcut(id, null)}
                  className="text-[10px] opacity-60 hover:opacity-100"
                  title="Reset to default"
                >
                  ↺
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        onClick={resetAll}
        className="mt-2 text-[11px] opacity-70 hover:opacity-100 underline"
      >
        {t("settings.shortcutsReset")}
      </button>
    </div>
  );
}
