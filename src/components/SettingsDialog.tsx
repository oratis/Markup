import { useState } from "react";
import { type Locale, useLocale, useT } from "../lib/i18n";
import { type Settings, useAppStore } from "../store";
import { ShortcutsEditor } from "./ShortcutsEditor";

interface Props {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: Props) {
  const t = useT();
  const [locale, setLocale] = useLocale();
  const fontSize = useAppStore((s) => s.fontSize);
  const proseMaxWidth = useAppStore((s) => s.proseMaxWidth);
  const autosaveMs = useAppStore((s) => s.autosaveMs);
  const imagePasteDir = useAppStore((s) => s.imagePasteDir);
  const setSettings = useAppStore((s) => s.setSettings);

  const exportTheme = useAppStore((s) => s.exportTheme);
  const spellcheck = useAppStore((s) => s.spellcheck);
  const lineWrap = useAppStore((s) => s.lineWrap);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const outlineWidth = useAppStore((s) => s.outlineWidth);
  const saveOnBlur = useAppStore((s) => s.saveOnBlur);
  const [draft, setDraft] = useState<Settings>({
    fontSize,
    proseMaxWidth,
    autosaveMs,
    imagePasteDir,
    exportTheme,
    spellcheck,
    lineWrap,
    sidebarWidth,
    outlineWidth,
    saveOnBlur,
  });

  function commit(patch: Partial<Settings>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setSettings(patch); // live-apply
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] max-w-[92vw] rounded-lg shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 p-5"
      >
        <div className="text-base font-semibold mb-4">{t("settings.title")}</div>

        <div className="space-y-4 text-[12px]">
          <Row label={t("settings.fontSize")} hint={`${draft.fontSize}px`}>
            <input
              type="range"
              min={11}
              max={24}
              value={draft.fontSize}
              onChange={(e) => commit({ fontSize: Number(e.target.value) })}
              className="flex-1"
            />
          </Row>

          <Row label={t("settings.proseWidth")} hint={`${draft.proseMaxWidth}px`}>
            <input
              type="range"
              min={480}
              max={1200}
              step={20}
              value={draft.proseMaxWidth}
              onChange={(e) => commit({ proseMaxWidth: Number(e.target.value) })}
              className="flex-1"
            />
          </Row>

          <Row
            label={t("settings.autosaveDelay")}
            hint={
              draft.autosaveMs === 0
                ? t("settings.autosaveDisabled")
                : `${draft.autosaveMs}ms`
            }
          >
            <input
              type="range"
              min={0}
              max={2000}
              step={50}
              value={draft.autosaveMs}
              onChange={(e) => commit({ autosaveMs: Number(e.target.value) })}
              className="flex-1"
            />
          </Row>

          <Row label={t("settings.imageDir")} hint={t("settings.imageDirHint")}>
            <input
              type="text"
              value={draft.imagePasteDir}
              onChange={(e) => commit({ imagePasteDir: e.target.value })}
              placeholder="assets"
              className="flex-1 px-2 py-1 rounded border border-black/10 dark:border-white/20 bg-transparent outline-none focus:border-blue-500"
            />
          </Row>

          <Row label={t("settings.locale")}>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="flex-1 px-2 py-1 rounded border border-black/10 dark:border-white/20 bg-transparent outline-none focus:border-blue-500"
            >
              <option value="auto">Auto (system)</option>
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </Row>

          <Row label={t("settings.exportTheme")}>
            <select
              value={draft.exportTheme}
              onChange={(e) =>
                commit({
                  exportTheme: e.target.value as Settings["exportTheme"],
                })
              }
              className="flex-1 px-2 py-1 rounded border border-black/10 dark:border-white/20 bg-transparent outline-none focus:border-blue-500"
            >
              <option value="github">GitHub</option>
              <option value="plain">Plain (serif)</option>
              <option value="tufte">Tufte</option>
            </select>
          </Row>

          <Row label={t("settings.spellcheck")} hint={t("settings.spellcheckHint")}>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draft.spellcheck}
                onChange={(e) => commit({ spellcheck: e.target.checked })}
              />
              <span className="opacity-70">
                {draft.spellcheck ? t("settings.on") : t("settings.off")}
              </span>
            </label>
          </Row>

          <Row label={t("settings.lineWrap")} hint={t("settings.lineWrapHint")}>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draft.lineWrap}
                onChange={(e) => commit({ lineWrap: e.target.checked })}
              />
              <span className="opacity-70">
                {draft.lineWrap ? t("settings.on") : t("settings.off")}
              </span>
            </label>
          </Row>

          <Row label={t("settings.saveOnBlur")} hint={t("settings.saveOnBlurHint")}>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draft.saveOnBlur}
                onChange={(e) => commit({ saveOnBlur: e.target.checked })}
              />
              <span className="opacity-70">
                {draft.saveOnBlur ? t("settings.on") : t("settings.off")}
              </span>
            </label>
          </Row>
        </div>

        <ShortcutsEditor />

        <div className="mt-6 flex items-center justify-between text-[11px]">
          <button
            onClick={() => {
              commit({
                fontSize: 16,
                proseMaxWidth: 720,
                autosaveMs: 300,
                imagePasteDir: "assets",
                exportTheme: "github",
                spellcheck: false,
                lineWrap: true,
                sidebarWidth: 260,
                outlineWidth: 220,
                saveOnBlur: false,
              });
            }}
            className="opacity-70 hover:opacity-100 underline"
          >
            {t("settings.restore")}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("settings.done")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-[120px] shrink-0 opacity-80">{label}</div>
      <div className="flex-1 flex items-center gap-3">{children}</div>
      {hint && (
        <div className="shrink-0 text-[11px] opacity-60 w-[80px] text-right">{hint}</div>
      )}
    </div>
  );
}
