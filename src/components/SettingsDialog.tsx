import { useState } from "react";
import { type Locale, useLocale, useT } from "../lib/i18n";
import { DEFAULT_SETTINGS, type Settings, useAppStore } from "../store";
import { ShortcutsEditor } from "./ShortcutsEditor";

interface Props {
  onClose: () => void;
}

type Category = "appearance" | "editor" | "files" | "shortcuts" | "advanced";

export function SettingsDialog({ onClose }: Props) {
  const t = useT();
  const [locale, setLocale] = useLocale();
  const [tab, setTab] = useState<Category>("appearance");

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
  const trimOnSave = useAppStore((s) => s.trimOnSave);
  const showLineNumbers = useAppStore((s) => s.showLineNumbers);
  const wordCountGoal = useAppStore((s) => s.wordCountGoal);
  const showToolbar = useAppStore((s) => s.showToolbar);
  const showTabBar = useAppStore((s) => s.showTabBar);
  const vaultSort = useAppStore((s) => s.vaultSort);
  const dailyNotesFolder = useAppStore((s) => s.dailyNotesFolder);
  const dailyNotesFormat = useAppStore((s) => s.dailyNotesFormat);
  const dailyNotesTemplate = useAppStore((s) => s.dailyNotesTemplate);
  const customCss = useAppStore((s) => s.customCss);
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
    trimOnSave,
    showLineNumbers,
    wordCountGoal,
    showToolbar,
    showTabBar,
    vaultSort,
    dailyNotesFolder,
    dailyNotesFormat,
    dailyNotesTemplate,
    customCss,
  });

  function commit(patch: Partial<Settings>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setSettings(patch); // live-apply
  }

  const categories: { id: Category; label: string }[] = [
    { id: "appearance", label: t("settings.catAppearance") },
    { id: "editor", label: t("settings.catEditor") },
    { id: "files", label: t("settings.catFiles") },
    { id: "shortcuts", label: t("settings.shortcuts") },
    { id: "advanced", label: t("settings.catAdvanced") },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mk-settings w-[760px] max-w-[94vw] h-[560px] max-h-[88vh] rounded-xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="mk-settings-header flex items-center justify-between px-5 h-12 shrink-0">
          <div className="mk-settings-title text-[15px] font-semibold">
            {t("settings.title")}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("settings.close")}
            className="mk-icon-btn text-[13px]"
          >
            ✕
          </button>
        </div>

        {/* Body: category nav + content pane */}
        <div className="flex flex-1 min-h-0">
          <nav className="mk-settings-nav w-[176px] shrink-0 p-2 space-y-0.5 overflow-y-auto no-scrollbar">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setTab(c.id)}
                className={`mk-settings-navbtn w-full text-left px-3 py-1.5 rounded-md text-[13px] ${
                  tab === c.id ? "is-active" : ""
                }`}
              >
                {c.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-w-0 overflow-y-auto px-6 py-4">
            <Panel active={tab === "appearance"} title={t("settings.catAppearance")}>
              <SliderField label={t("settings.fontSize")} value={`${draft.fontSize}px`}>
                <input
                  type="range"
                  min={11}
                  max={24}
                  value={draft.fontSize}
                  onChange={(e) => commit({ fontSize: Number(e.target.value) })}
                  className="w-full"
                />
              </SliderField>

              <SliderField
                label={t("settings.proseWidth")}
                value={`${draft.proseMaxWidth}px`}
              >
                <input
                  type="range"
                  min={480}
                  max={1200}
                  step={20}
                  value={draft.proseMaxWidth}
                  onChange={(e) => commit({ proseMaxWidth: Number(e.target.value) })}
                  className="w-full"
                />
              </SliderField>

              <RowField label={t("settings.locale")}>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                  className="mk-settings-select w-[180px] px-2 py-1 text-[12px]"
                >
                  <option value="auto">Auto (system)</option>
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                </select>
              </RowField>

              <RowField label={t("settings.exportTheme")}>
                <select
                  value={draft.exportTheme}
                  onChange={(e) =>
                    commit({ exportTheme: e.target.value as Settings["exportTheme"] })
                  }
                  className="mk-settings-select w-[180px] px-2 py-1 text-[12px]"
                >
                  <option value="github">GitHub</option>
                  <option value="plain">Plain (serif)</option>
                  <option value="tufte">Tufte</option>
                </select>
              </RowField>
            </Panel>

            <Panel active={tab === "editor"} title={t("settings.catEditor")}>
              <ToggleField
                label={t("settings.spellcheck")}
                desc={t("settings.spellcheckHint")}
                checked={draft.spellcheck}
                onChange={(v) => commit({ spellcheck: v })}
              />
              <ToggleField
                label={t("settings.lineWrap")}
                desc={t("settings.lineWrapHint")}
                checked={draft.lineWrap}
                onChange={(v) => commit({ lineWrap: v })}
              />
              <ToggleField
                label={t("settings.lineNumbers")}
                desc={t("settings.lineNumbersHint")}
                checked={draft.showLineNumbers}
                onChange={(v) => commit({ showLineNumbers: v })}
              />
            </Panel>

            <Panel active={tab === "files"} title={t("settings.catFiles")}>
              <SliderField
                label={t("settings.autosaveDelay")}
                value={
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
                  className="w-full"
                />
              </SliderField>

              <ToggleField
                label={t("settings.saveOnBlur")}
                desc={t("settings.saveOnBlurHint")}
                checked={draft.saveOnBlur}
                onChange={(v) => commit({ saveOnBlur: v })}
              />
              <ToggleField
                label={t("settings.trimOnSave")}
                desc={t("settings.trimOnSaveHint")}
                checked={draft.trimOnSave}
                onChange={(v) => commit({ trimOnSave: v })}
              />

              <RowField label={t("settings.imageDir")} desc={t("settings.imageDirHint")}>
                <input
                  type="text"
                  value={draft.imagePasteDir}
                  onChange={(e) => commit({ imagePasteDir: e.target.value })}
                  placeholder="assets"
                  className="mk-settings-input w-[180px] px-2 py-1 text-[12px]"
                />
              </RowField>
            </Panel>

            <Panel active={tab === "shortcuts"} title={t("settings.shortcuts")}>
              <ShortcutsEditor />
            </Panel>

            <Panel active={tab === "advanced"} title={t("settings.catAdvanced")}>
              <StackField
                label={t("settings.customCss")}
                desc={t("settings.customCssHint")}
              >
                <textarea
                  value={draft.customCss}
                  onChange={(e) => commit({ customCss: e.target.value })}
                  placeholder=".milkdown .editor h1 { color: teal; }"
                  spellCheck={false}
                  rows={6}
                  className="mk-settings-textarea w-full px-2 py-2 font-mono text-[11px] resize-y"
                />
              </StackField>
            </Panel>
          </div>
        </div>

        {/* Footer */}
        <div className="mk-settings-footer flex items-center justify-between px-5 h-14 shrink-0">
          <button
            type="button"
            onClick={() => commit(DEFAULT_SETTINGS)}
            className="mk-settings-desc text-[12px] hover:underline"
          >
            {t("settings.restore")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mk-settings-done px-4 py-1.5 rounded-md text-[13px] font-medium"
          >
            {t("settings.done")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** A category's content. All panels stay mounted; inactive ones are hidden so
 *  drafted state (and tests that query across categories) keep working. */
function Panel({
  active,
  title,
  children,
}: {
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={active ? "" : "hidden"}>
      <h2 className="mk-settings-title text-[14px] font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function LabelBlock({ label, desc }: { label: string; desc?: string }) {
  return (
    <div className="min-w-0 pr-4">
      <div className="mk-settings-label text-[13px] leading-tight">{label}</div>
      {desc && (
        <div className="mk-settings-desc text-[11px] leading-snug mt-0.5">{desc}</div>
      )}
    </div>
  );
}

/** Label (+ optional description) on the left, control on the right. */
function RowField({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mk-settings-row flex items-center justify-between gap-3 py-3">
      <LabelBlock label={label} desc={desc} />
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Label + live value header with a full-width slider beneath. */
function SliderField({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mk-settings-row py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="mk-settings-label text-[13px]">{label}</div>
        <div className="mk-settings-desc text-[11px] tabular-nums">{value}</div>
      </div>
      {children}
    </div>
  );
}

/** Label (+ optional description) stacked above a full-width control. */
function StackField({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mk-settings-row py-3">
      <LabelBlock label={label} desc={desc} />
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ToggleField({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <RowField label={label} desc={desc}>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </RowField>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`mk-toggle ${checked ? "is-on" : ""}`}
    >
      <span className="mk-toggle-thumb" />
    </button>
  );
}
