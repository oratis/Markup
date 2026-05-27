import { useEffect, useMemo, useState } from "react";
import { getActiveSourceView } from "../lib/active-source-view";
import { moveSectionToLine } from "../lib/cm-section";
import { type Heading, parseHeadings } from "../lib/headings";
import { useT } from "../lib/i18n";
import { parseHeadingsAsync } from "../lib/outline-client";
import { buildParagraphLink } from "../lib/paragraph-link";
import { getActiveTab, useAppStore } from "../store";
import { showToast } from "./Toast";

const DRAG_MIME = "application/x-markup-heading";

/** Above this size we delegate parsing to the worker. Below it the inline
 *  scanner is faster than the postMessage round-trip. */
const WORKER_THRESHOLD = 50_000;

/** Walk the heading list to find the entry that owns `cursorLine`. */
function activeHeadingIndex(headings: Heading[], cursorLine: number): number {
  let idx = -1;
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].line <= cursorLine) idx = i;
    else break;
  }
  return idx;
}

export function Outline() {
  const t = useT();
  const tab = useAppStore(getActiveTab);

  // Inline path for small docs (no async cost), worker for big ones to
  // keep input latency under 16ms even on 1MB+ files.
  const inlineHeadings = useMemo(() => {
    if (!tab) return [];
    return tab.content.length <= WORKER_THRESHOLD ? parseHeadings(tab.content) : [];
  }, [tab?.content]);

  const [workerHeadings, setWorkerHeadings] = useState<Heading[]>([]);
  useEffect(() => {
    if (!tab) {
      setWorkerHeadings([]);
      return;
    }
    if (tab.content.length <= WORKER_THRESHOLD) {
      setWorkerHeadings([]);
      return;
    }
    let cancelled = false;
    parseHeadingsAsync(tab.content).then((h) => {
      if (!cancelled) setWorkerHeadings(h);
    });
    return () => {
      cancelled = true;
    };
  }, [tab?.content]);

  const allHeadings =
    tab && tab.content.length > WORKER_THRESHOLD ? workerHeadings : inlineHeadings;

  const [filter, setFilter] = useState("");
  const [maxLevel, setMaxLevel] = useState(6);
  const [ctx, setCtx] = useState<{ heading: Heading; x: number; y: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    line: number;
    position: "before" | "after";
  } | null>(null);
  const headings = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return allHeadings.filter((h) => {
      if (h.level > maxLevel) return false;
      if (q && !h.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allHeadings, filter, maxLevel]);

  // Track the active heading via cursor position. selectionchange fires
  // whenever the user clicks / arrows / types in either editor.
  const sourceMode = useAppStore((s) => s.sourceMode);
  const [activeIdx, setActiveIdx] = useState(-1);
  useEffect(() => {
    if (!tab || headings.length === 0) {
      setActiveIdx(-1);
      return;
    }
    const recompute = () => {
      let line = 0;
      if (sourceMode) {
        const view = getActiveSourceView();
        if (view) {
          const head = view.state.selection.main.head;
          line = view.state.doc.lineAt(head).number - 1;
        }
      } else {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const block = (sel.getRangeAt(0).startContainer as Element).closest?.(
            "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre",
          );
          const blockText = block?.textContent ?? "";
          const idx = blockText ? tab.content.indexOf(blockText) : -1;
          if (idx >= 0) line = tab.content.slice(0, idx).split("\n").length - 1;
        }
      }
      setActiveIdx(activeHeadingIndex(headings, line));
    };
    recompute();
    document.addEventListener("selectionchange", recompute);
    return () => document.removeEventListener("selectionchange", recompute);
  }, [tab?.content, headings, sourceMode]);

  if (!tab) return null;
  if (allHeadings.length === 0) {
    return <div className="text-xs opacity-50 px-3 py-3">{t("outline.empty")}</div>;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wider opacity-50">
        {t("outline.title")}
      </div>
      <div className="px-3 pb-2 flex flex-col gap-1">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("outline.filter")}
          className="w-full text-[12px] px-2 py-1 rounded border border-black/10 dark:border-white/15 bg-transparent outline-none focus:border-blue-500"
        />
        <div className="flex items-center gap-0.5">
          {([1, 2, 3, 4, 5, 6] as const).map((lvl) => (
            <button
              type="button"
              key={lvl}
              title={t("outline.levelTitle", lvl)}
              aria-pressed={maxLevel === lvl}
              onClick={() => setMaxLevel(lvl === maxLevel ? 6 : lvl)}
              className={`text-[10px] font-mono w-6 h-5 leading-none rounded ${
                maxLevel === lvl
                  ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                  : "hover:bg-black/5 dark:hover:bg-white/10 opacity-60"
              }`}
            >
              H{lvl}
            </button>
          ))}
          <span
            className="opacity-30 ml-1 text-[10px] truncate"
            title={maxLevel < 6 ? t("outline.levelCap", maxLevel) : t("outline.levelAll")}
          >
            {maxLevel < 6 ? `≤H${maxLevel}` : "all"}
          </span>
        </div>
      </div>
      <nav className="flex-1 min-h-0 overflow-auto no-scrollbar pb-2">
        {headings.length === 0 && (
          <div className="text-[11px] opacity-50 px-3 py-2">
            {t("outline.noFilterMatch")}
          </div>
        )}
        {headings.map((h, i) => {
          const isActive = i === activeIdx;
          const isDropBefore =
            dropTarget?.line === h.line && dropTarget?.position === "before";
          const isDropAfter =
            dropTarget?.line === h.line && dropTarget?.position === "after";
          return (
            <button
              key={`${h.line}-${i}`}
              draggable
              ref={
                isActive
                  ? (el) => {
                      // jsdom doesn't implement scrollIntoView; guard so tests
                      // don't throw.
                      el?.scrollIntoView?.({ block: "nearest" });
                    }
                  : undefined
              }
              onClick={() => scrollToHeading(h.text, h.level, h.line)}
              onContextMenu={(e) => {
                e.preventDefault();
                setCtx({ heading: h, x: e.clientX, y: e.clientY });
              }}
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_MIME, String(h.line));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const position =
                  e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                setDropTarget({ line: h.line, position });
              }}
              onDragLeave={() => {
                if (dropTarget?.line === h.line) setDropTarget(null);
              }}
              onDrop={(e) => {
                const raw = e.dataTransfer.getData(DRAG_MIME);
                setDropTarget(null);
                if (!raw) return;
                const sourceLine = Number(raw);
                if (!Number.isInteger(sourceLine) || sourceLine === h.line) return;
                e.preventDefault();
                moveSectionToLine(sourceLine, h.line, dropTarget?.position ?? "after");
              }}
              onDragEnd={() => setDropTarget(null)}
              title={h.text}
              className={`w-full text-left text-[12px] py-0.5 truncate block relative ${
                isActive
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                  : "hover:bg-black/5 dark:hover:bg-white/10"
              } ${
                isDropBefore
                  ? "border-t-2 border-blue-500"
                  : isDropAfter
                    ? "border-b-2 border-blue-500"
                    : ""
              }`}
              style={{
                paddingLeft: `${0.75 + (h.level - 1) * 0.85}rem`,
                paddingRight: "0.5rem",
              }}
            >
              <span className="truncate">{h.text}</span>
            </button>
          );
        })}
      </nav>
      {ctx && (
        <OutlineCtxMenu
          x={ctx.x}
          y={ctx.y}
          onClose={() => setCtx(null)}
          items={[
            {
              label: t("outline.ctx.copyLink"),
              run: () => {
                if (!tab) return;
                const link = buildParagraphLink(tab.path, tab.content, ctx.heading.line);
                navigator.clipboard
                  .writeText(link)
                  .then(() => showToast(t("toast.copied", link)))
                  .catch(() => showToast(t("toast.copyFailed")));
              },
            },
            {
              label: t("outline.ctx.copyText"),
              run: () => {
                navigator.clipboard
                  .writeText(ctx.heading.text)
                  .then(() => showToast(t("toast.copied", ctx.heading.text)))
                  .catch(() => showToast(t("toast.copyFailed")));
              },
            },
            {
              label: t("outline.ctx.scrollTo"),
              run: () =>
                scrollToHeading(ctx.heading.text, ctx.heading.level, ctx.heading.line),
            },
          ]}
        />
      )}
    </div>
  );
}

interface OutlineCtxMenuItem {
  label: string;
  run: () => void;
}

function OutlineCtxMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: OutlineCtxMenuItem[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        style={{ left: x, top: y }}
        className="absolute min-w-[180px] py-1 rounded-md shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((it) => (
          <button
            type="button"
            key={it.label}
            onClick={() => {
              onClose();
              it.run();
            }}
            className="w-full text-left px-3 py-1 text-[12px] hover:bg-black/5 dark:hover:bg-white/10"
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Scroll the rendered editor to the heading whose text + level match.
 *
 * Strategy:
 *  - WYSIWYG: Milkdown renders real `<h1>` … `<h6>`; query by tag + text.
 *  - Source mode: CM6 only renders flat `.cm-line` spans, so we need its
 *    own dispatch + scrollIntoView API. We use the `line` index parsed
 *    earlier to compute a doc position and dispatch a selection there.
 */
function scrollToHeading(text: string, level: number, line: number) {
  // Source-mode path
  const view = getActiveSourceView();
  if (view) {
    const lineIdx = Math.max(1, line + 1); // CM6 lines are 1-based
    const doc = view.state.doc;
    if (lineIdx <= doc.lines) {
      const lineObj = doc.line(lineIdx);
      view.dispatch({
        selection: { anchor: lineObj.from, head: lineObj.from },
        effects: view.scrollSnapshot(),
      });
      view.dispatch({
        effects: [],
        scrollIntoView: true,
        selection: { anchor: lineObj.from, head: lineObj.from },
      } as Parameters<typeof view.dispatch>[0]);
      view.focus();
      return;
    }
  }
  // WYSIWYG / fallback path
  const tag = `H${level}`;
  const candidates = document.querySelectorAll(`.milkdown ${tag}`);
  for (const node of Array.from(candidates)) {
    if ((node.textContent ?? "").trim() === text) {
      (node as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
  }
}
