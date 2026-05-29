import { useEffect } from "react";
import { writeSession } from "../lib/session";

interface TabLike {
  path: string | null;
}

/**
 * Persists the open-tab session — the list of path-backed tabs plus the
 * currently active path — so it can be restored on the next launch.
 *
 * Behaviour-preserving extraction of the session-persistence effect from
 * App.tsx.
 */
export function useSessionPersistence(
  tabs: ReadonlyArray<TabLike>,
  activePath: string | null | undefined,
) {
  useEffect(() => {
    const open = tabs.map((t) => t.path).filter((p): p is string => Boolean(p));
    writeSession({ open, active: activePath ?? null });
  }, [tabs, activePath]);
}
