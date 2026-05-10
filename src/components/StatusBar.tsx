import { useEffect, useState } from "react";
import { getActiveSourceView } from "../lib/active-source-view";
import { useT } from "../lib/i18n";
import { getActiveTab, useAppStore } from "../store";

export function countWords(text: string): number {
  // CJK characters each count as a word; runs of non-whitespace as one word.
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) ?? []).length;
  const nonCjk = text.replace(/[㐀-鿿豈-﫿]/g, " ");
  const words = nonCjk.trim().length === 0 ? 0 : nonCjk.trim().split(/\s+/).length;
  return cjk + words;
}

function readSelection(sourceMode: boolean): string {
  if (sourceMode) {
    const v = getActiveSourceView();
    if (!v) return "";
    const { from, to } = v.state.selection.main;
    return from === to ? "" : v.state.sliceDoc(from, to);
  }
  return window.getSelection()?.toString() ?? "";
}

function readCaret(): { line: number; col: number } | null {
  const v = getActiveSourceView();
  if (!v) return null;
  const head = v.state.selection.main.head;
  const line = v.state.doc.lineAt(head);
  return { line: line.number, col: head - line.from + 1 };
}

interface Stats {
  words: number;
  chars: number;
  lines: number;
}

const HEAVY_THRESHOLD = 100_000;
const DEBOUNCE_MS = 250;

export function StatusBar() {
  const t = useT();
  const tab = useAppStore(getActiveTab);
  const sourceMode = useAppStore((s) => s.sourceMode);
  const vaultRoot = useAppStore((s) => s.vaultRoot);

  const [stats, setStats] = useState<Stats>({ words: 0, chars: 0, lines: 0 });
  const [selStats, setSelStats] = useState<{ words: number; chars: number } | null>(null);
  const [caret, setCaret] = useState<{ line: number; col: number } | null>(null);

  // Recompute synchronously for small docs, debounced for big ones to keep
  // input latency tight (countWords scans the full string + a couple of
  // regex passes; ~5ms at 100k chars on M1, much worse on Intel).
  useEffect(() => {
    if (!tab) {
      setStats({ words: 0, chars: 0, lines: 0 });
      return;
    }
    const compute = () => {
      setStats({
        words: countWords(tab.content),
        chars: tab.content.length,
        lines: tab.content.split("\n").length,
      });
    };
    if (tab.content.length < HEAVY_THRESHOLD) {
      compute();
      return;
    }
    const id = window.setTimeout(compute, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [tab?.content]);

  // Selection counter: refresh on every DOM `selectionchange`. Milkdown
  // (ProseMirror) and CodeMirror both surface their selection through the
  // DOM Selection API, so a single global listener covers both modes. We
  // run on the next animation frame so the read happens after the editor
  // has applied the new selection. The same listener also feeds the
  // caret position display in source mode.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const text = readSelection(sourceMode);
      setSelStats(text ? { words: countWords(text), chars: text.length } : null);
      setCaret(sourceMode ? readCaret() : null);
    };
    update();
    const onChange = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      document.removeEventListener("selectionchange", onChange);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [sourceMode]);

  const status = tab?.status ?? "saved";
  const statusLabel =
    status === "saved"
      ? t("status.saved")
      : status === "dirty"
        ? t("status.dirty")
        : status === "saving"
          ? t("status.saving")
          : t("status.error", tab?.errorMessage ?? "unknown");

  return (
    <div className="statusbar flex items-center gap-3 h-6 px-3 text-[11px] opacity-70 border-t border-black/5 dark:border-white/10 select-none">
      <span>{sourceMode ? t("status.mode.source") : t("status.mode.wysiwyg")}</span>
      <span className="opacity-30">|</span>
      <span>{t("status.words", stats.words)}</span>
      <span>{t("status.chars", stats.chars)}</span>
      <span>{t("status.lines", stats.lines)}</span>
      {caret && (
        <>
          <span className="opacity-30">|</span>
          <span aria-live="polite">{t("status.caret", caret.line, caret.col)}</span>
        </>
      )}
      {selStats && (
        <>
          <span className="opacity-30">|</span>
          <span aria-live="polite">
            {t("status.selection", selStats.words, selStats.chars)}
          </span>
        </>
      )}
      <span className="flex-1" />
      {vaultRoot && <span className="truncate max-w-[260px]">{vaultRoot}</span>}
      <span className="opacity-30">|</span>
      <span aria-live="polite">{statusLabel}</span>
    </div>
  );
}
