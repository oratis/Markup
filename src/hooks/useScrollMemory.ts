import { type RefObject, useEffect } from "react";
import { getScroll, setScroll } from "../lib/scroll-memory";

/**
 * Per-tab WYSIWYG scroll memory: restores the saved offset on tab switch and
 * captures it on scroll. Inactive in source mode — SourceEditor owns its own
 * scroll element there.
 *
 * Behaviour-preserving extraction of the scroll-memory effect from App.tsx.
 */
export function useScrollMemory(
  scrollRef: RefObject<HTMLElement | null>,
  tabId: string | undefined,
  sourceMode: boolean,
) {
  useEffect(() => {
    const host = scrollRef.current;
    if (!host || !tabId || sourceMode) return;
    // Restore after first paint so layout is established. rAF is fine —
    // Milkdown mounts synchronously by the time we get here.
    const raf = window.requestAnimationFrame(() => {
      host.scrollTop = getScroll(tabId);
    });
    const onScroll = () => setScroll(tabId, host.scrollTop);
    host.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      host.removeEventListener("scroll", onScroll);
    };
  }, [scrollRef, tabId, sourceMode]);
}
