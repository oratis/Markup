import { useEffect, useRef, useState } from "react";

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
  const [query, setQuery] = useState("");
  const [missing, setMissing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function findNext(backwards = false) {
    if (!query) return;
    // @ts-expect-error — window.find is non-standard but works in WebKit/Tauri
    const found: boolean = window.find(query, false, backwards, true);
    setMissing(!found);
  }

  if (sourceMode) {
    return (
      <div className="absolute top-12 right-3 z-40 px-3 py-2 rounded shadow-lg bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 text-[12px]">
        <span className="opacity-70">
          Press ⌘F again — CodeMirror has its own search overlay.
        </span>
        <button onClick={onClose} className="ml-3 opacity-60 hover:opacity-100">
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-12 right-3 z-40 flex items-center gap-1 px-2 py-1 rounded shadow-lg bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15">
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
        placeholder="Find…"
        className={`w-[220px] px-2 py-0.5 text-[12px] bg-transparent outline-none ${
          missing ? "text-red-500" : ""
        }`}
      />
      <button
        title="Previous"
        onClick={() => findNext(true)}
        className="w-5 h-5 leading-none rounded hover:bg-black/5 dark:hover:bg-white/10"
      >
        ↑
      </button>
      <button
        title="Next"
        onClick={() => findNext(false)}
        className="w-5 h-5 leading-none rounded hover:bg-black/5 dark:hover:bg-white/10"
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
  );
}
