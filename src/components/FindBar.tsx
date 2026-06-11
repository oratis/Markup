import { useEffect, useMemo, useRef, useState } from "react";
import { countMatches } from "../lib/count-matches";
import { useT } from "../lib/i18n";
import { replaceAll, replaceOnce } from "../lib/text-replace";
import { getActiveTab, useAppStore } from "../store";

interface Props {
  /** When true, this is rendered in source mode — CM6 has its own search
   * panel; this bar is suppressed because CM6 binds ⌘F natively. */
  sourceMode: boolean;
  onClose: () => void;
}

/**
 * Floating in-file find bar. Uses the WebKit-supported, non-standard
 * `window.find(string, caseSensitive, backwards, wrapAround)` API to search
 * within the live document. Adequate for the WYSIWYG view; for source mode
 * we defer to CodeMirror's native search overlay (⌘F).
 */
export function FindBar({ sourceMode, onClose }: Props) {
  const t = useT();
  const tab = useAppStore(getActiveTab);
  const updateActiveContent = useAppStore((s) => s.updateActiveContent);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [missing, setMissing] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const total = useMemo(
    () => (tab && query ? countMatches(tab.content, query, caseSensitive, useRegex) : 0),
    [tab?.content, query, caseSensitive, useRegex],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function findNext(backwards = false) {
    if (!query) return;
    // window.find navigates the rendered DOM but can't take a regex. So in
    // regex mode we can't step through matches in the WYSIWYG view — the count
    // badge reports how many exist, and Replace still works (on the source).
    // Step-through regex navigation here needs a redesign (the find surface is
    // the rendered DOM while replace/count are the markdown source); source
    // mode already gets CodeMirror's native regex search.
    if (useRegex) {
      setMissing(total === 0);
      return;
    }
    // @ts-expect-error — window.find is non-standard but works in WebKit/Tauri
    const found: boolean = window.find(query, caseSensitive, backwards, true);
    setMissing(!found);
  }

  function handleReplaceOnce() {
    if (!query || !tab) return;
    if (useRegex) {
      try {
        const re = new RegExp(query, caseSensitive ? "" : "i");
        const m = re.exec(tab.content);
        if (!m) {
          setMissing(true);
          return;
        }
        const next =
          tab.content.slice(0, m.index) +
          replacement +
          tab.content.slice(m.index + m[0].length);
        updateActiveContent(next);
      } catch {
        setMissing(true);
      }
      return;
    }
    const r = replaceOnce(tab.content, query, replacement, { caseSensitive });
    if (r.index < 0) {
      setMissing(true);
      return;
    }
    updateActiveContent(r.text);
  }

  function handleReplaceAll() {
    if (!query || !tab) return;
    if (useRegex) {
      try {
        const re = new RegExp(query, caseSensitive ? "g" : "gi");
        let count = 0;
        const next = tab.content.replace(re, () => {
          count++;
          return replacement;
        });
        if (count === 0) {
          setMissing(true);
          return;
        }
        updateActiveContent(next);
      } catch {
        setMissing(true);
      }
      return;
    }
    const result = replaceAll(tab.content, query, replacement, { caseSensitive });
    if (result.count === 0) {
      setMissing(true);
      return;
    }
    updateActiveContent(result.text);
  }

  if (sourceMode) {
    return (
      <div className="absolute top-12 right-3 z-40 px-3 py-2 rounded shadow-lg bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 text-[12px]">
        <span className="opacity-70">{t("find.cmHint")}</span>
        <button onClick={onClose} className="ml-3 opacity-60 hover:opacity-100">
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-12 right-3 z-40 flex flex-col gap-1 px-2 py-1 rounded shadow-lg bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setMissing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            } else if (e.key === "Enter") {
              e.preventDefault();
              findNext(e.shiftKey);
            }
          }}
          placeholder={t("find.placeholder")}
          className={`w-[220px] px-2 py-0.5 text-[12px] bg-transparent outline-none ${
            missing ? "text-red-500" : ""
          }`}
        />
        {query && (
          <span
            className={`text-[10px] tabular-nums opacity-70 px-1 ${
              total === 0 ? "text-red-500" : ""
            }`}
          >
            {total === 0 ? "0" : total >= 9999 ? "9999+" : total}
          </span>
        )}
        <button
          title={t("find.caseSensitive")}
          aria-label={t("find.caseSensitive")}
          aria-pressed={caseSensitive}
          onClick={() => setCaseSensitive((v) => !v)}
          className={`text-[10px] font-mono w-5 h-5 leading-none rounded ${
            caseSensitive
              ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
              : "hover:bg-black/5 dark:hover:bg-white/10 opacity-60"
          }`}
        >
          Aa
        </button>
        <button
          title={t("find.regex")}
          aria-label={t("find.regex")}
          aria-pressed={useRegex}
          onClick={() => setUseRegex((v) => !v)}
          className={`text-[10px] font-mono w-5 h-5 leading-none rounded ${
            useRegex
              ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
              : "hover:bg-black/5 dark:hover:bg-white/10 opacity-60"
          }`}
        >
          .*
        </button>
        <button
          title={useRegex ? t("find.regexNavHint") : "Previous"}
          aria-label="Previous"
          disabled={useRegex}
          onClick={() => findNext(true)}
          className={`w-5 h-5 leading-none rounded ${
            useRegex
              ? "opacity-30 cursor-not-allowed"
              : "hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          ↑
        </button>
        <button
          title={useRegex ? t("find.regexNavHint") : "Next"}
          aria-label="Next"
          disabled={useRegex}
          onClick={() => findNext(false)}
          className={`w-5 h-5 leading-none rounded ${
            useRegex
              ? "opacity-30 cursor-not-allowed"
              : "hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          ↓
        </button>
        <button
          title="Close"
          onClick={onClose}
          className="w-5 h-5 leading-none rounded hover:bg-black/5 dark:hover:bg-white/10"
        >
          ×
        </button>
      </div>
      <div className="flex items-center gap-1">
        <input
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            } else if (e.key === "Enter") {
              e.preventDefault();
              // Enter replaces ONCE — matching the adjacent "Replace" button.
              // (Replace-All stays an explicit click, not a stray Enter.)
              handleReplaceOnce();
            }
          }}
          placeholder={t("find.replacePlaceholder")}
          className="w-[220px] px-2 py-0.5 text-[12px] bg-transparent outline-none"
        />
        <button
          title={t("find.replace")}
          onClick={handleReplaceOnce}
          disabled={!query}
          className="text-[10px] px-2 h-5 leading-none rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
        >
          {t("find.replace")}
        </button>
        <button
          title={t("find.replaceAll")}
          onClick={handleReplaceAll}
          disabled={!query}
          className="text-[10px] px-2 h-5 leading-none rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
        >
          {t("find.replaceAll")}
        </button>
      </div>
    </div>
  );
}
