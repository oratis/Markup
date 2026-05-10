import { useEffect, useState } from "react";

interface ToastInfo {
  id: number;
  message: string;
  ms?: number;
}

let nextId = 1;
let dispatch: ((t: ToastInfo) => void) | null = null;

/** Show a transient toast notification. Safe to call from anywhere. */
export function showToast(message: string, ms = 1800) {
  const t: ToastInfo = { id: nextId++, message, ms };
  if (dispatch) dispatch(t);
}

/**
 * Mounts the toast portal. There should be exactly one of these in the app.
 * Renders a fixed bottom-center stack with auto-dismiss.
 */
export function ToastHost() {
  const [items, setItems] = useState<ToastInfo[]>([]);

  useEffect(() => {
    dispatch = (t) => {
      setItems((cur) => [...cur, t]);
      window.setTimeout(() => {
        setItems((cur) => cur.filter((x) => x.id !== t.id));
      }, t.ms ?? 1800);
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
          className="px-3 py-1.5 rounded-md text-[12px] shadow-lg bg-black/85 text-white backdrop-blur-sm"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
