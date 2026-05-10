import { useEffect, useMemo, useRef, useState } from "react";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string;
  run: () => void | Promise<void>;
}

interface Props {
  commands: Command[];
  onClose: () => void;
}

export function CommandPalette({ commands, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matches = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) =>
      `${c.label} ${c.hint ?? ""}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  async function runIndex(i: number) {
    const c = matches[i];
    if (!c) return;
    onClose();
    // Defer one tick so the modal is gone before the action runs.
    setTimeout(() => Promise.resolve(c.run()).catch(console.error), 0);
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-start justify-center pt-[14vh] z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[560px] max-w-[90vw] rounded-md shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 overflow-hidden"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((s) => Math.min(matches.length - 1, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((s) => Math.max(0, s - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              runIndex(selected);
            }
          }}
          placeholder="Run a command…"
          className="w-full px-4 py-3 text-[14px] bg-transparent outline-none border-b border-black/5 dark:border-white/10"
        />
        <div className="max-h-[44vh] overflow-auto no-scrollbar">
          {matches.map((c, i) => (
            <button
              key={c.id}
              onClick={() => runIndex(i)}
              onMouseEnter={() => setSelected(i)}
              className={`w-full text-left px-4 py-1.5 text-[12px] flex items-center gap-2 ${
                i === selected ? "bg-black/10 dark:bg-white/15" : ""
              }`}
            >
              <span className="flex-1 truncate">{c.label}</span>
              {c.hint && <span className="opacity-50 text-[11px]">{c.hint}</span>}
              {c.shortcut && (
                <span className="text-[10px] opacity-50 font-mono">
                  {c.shortcut}
                </span>
              )}
            </button>
          ))}
          {matches.length === 0 && (
            <div className="px-4 py-3 text-xs opacity-50">No commands.</div>
          )}
        </div>
      </div>
    </div>
  );
}

