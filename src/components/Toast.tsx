import { useEffect, useState } from "react";

interface ToastInfo {
  id: number;
  message: string;
  ms: number;
  /** Animation phase: "in" → "settled" → "out". */
  phase: "in" | "settled" | "out";
}

const MAX_VISIBLE = 3;
const ENTER_MS = 160;
const EXIT_MS = 200;

let nextId = 1;
let dispatch: ((message: string, ms: number) => void) | null = null;

/** Show a transient toast notification. Safe to call from anywhere. */
export function showToast(message: string, ms = 1800) {
  if (dispatch) dispatch(message, ms);
}

/**
 * Mounts the toast portal. There should be exactly one of these in the app.
 * Renders a fixed bottom-center stack with auto-dismiss + fade.
 *
 * Behaviour
 *  - At most MAX_VISIBLE toasts visible at once; further calls are dropped
 *    to the front of the stack so the most recent ones win.
 *  - Each toast has 3 phases: enter (slide+fade in), settled (visible),
 *    exit (fade out). The total visible time is `ms`.
 */
export function ToastHost() {
  const [items, setItems] = useState<ToastInfo[]>([]);

  useEffect(() => {
    dispatch = (message, ms) => {
      const id = nextId++;
      setItems((cur) => {
        // Cap by removing oldest "settled" before adding new
        const trimmed = cur.length >= MAX_VISIBLE ? cur.slice(-(MAX_VISIBLE - 1)) : cur;
        return [...trimmed, { id, message, ms, phase: "in" }];
      });

      // Promote: in → settled
      window.setTimeout(() => {
        setItems((cur) => cur.map((t) => (t.id === id ? { ...t, phase: "settled" } : t)));
      }, ENTER_MS);

      // Promote: settled → out
      window.setTimeout(() => {
        setItems((cur) => cur.map((t) => (t.id === id ? { ...t, phase: "out" } : t)));
      }, ms);

      // Remove
      window.setTimeout(() => {
        setItems((cur) => cur.filter((t) => t.id !== id));
      }, ms + EXIT_MS);
    };
    return () => {
      dispatch = null;
    };
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none fixed left-0 right-0 bottom-8 flex flex-col items-center gap-2 z-50">
      {items.map((t) => (
        <div
          key={t.id}
          data-phase={t.phase}
          className="toast-item px-3 py-1.5 rounded-md text-[12px] shadow-lg bg-black/85 text-white backdrop-blur-sm"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
