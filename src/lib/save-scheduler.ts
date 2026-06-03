/**
 * Per-tab debounced autosave scheduling + the post-write finalisation decision.
 *
 * Extracted from App.tsx so the tricky parts are unit-testable:
 *  - The previous model used ONE shared timer and `performSave` resolved the
 *    *active* tab when it fired — so editing tab A then switching to B made the
 *    autosave write B (and silently drop A's pending save). A per-tab timer map
 *    fixes both: each tab's edit schedules its own save, bound to its own id.
 *  - After the awaited write, finalising must not clobber an edit the user
 *    typed during the write window (see planSaveFinalize).
 */
import type { SaveStatus } from "../store";

export interface SaveScheduler {
  /** (Re)arm a debounced save for `tabId`. Re-scheduling the same id cancels
   *  its previous pending timer (debounce); other tabs are unaffected. */
  schedule(tabId: string, delayMs: number, run: () => void): void;
  /** Cancel `tabId`'s pending save (e.g. just before a synchronous ⌘S flush). */
  cancel(tabId: string): void;
  /** Cancel every pending save (component unmount). */
  cancelAll(): void;
  pending(tabId: string): boolean;
}

export function createSaveScheduler(
  setTimer: (cb: () => void, ms: number) => number = (cb, ms) =>
    window.setTimeout(cb, ms),
  clearTimer: (id: number) => void = (id) => window.clearTimeout(id),
): SaveScheduler {
  const timers = new Map<string, number>();
  const cancel = (tabId: string) => {
    const h = timers.get(tabId);
    if (h !== undefined) {
      clearTimer(h);
      timers.delete(tabId);
    }
  };
  return {
    schedule(tabId, delayMs, run) {
      cancel(tabId);
      const h = setTimer(() => {
        timers.delete(tabId);
        run();
      }, delayMs);
      timers.set(tabId, h);
    },
    cancel,
    cancelAll() {
      for (const h of timers.values()) clearTimer(h);
      timers.clear();
    },
    pending(tabId) {
      return timers.has(tabId);
    },
  };
}

/** A patch to apply to the saved tab once its write resolves. */
export interface SaveFinalizePlan {
  status?: SaveStatus;
  mtimeMs: number;
  content?: string;
  errorMessage: null;
}

/**
 * Decide how to finalise a tab after `writeFile` resolves.
 *
 * The save snapshots the tab's content, then awaits an IPC write. If the user
 * keeps typing during that window the tab now holds NEWER content. Finalising
 * blindly (status→saved, and — with trimOnSave — writing the trimmed snapshot
 * back) would both mislabel and DESTROY that in-flight edit. So:
 *  - content changed during the write → record the fresh mtime (valid token for
 *    the next save, since we did just write to disk) but keep the tab DIRTY and
 *    never overwrite its content; the re-armed timer flushes the newer text.
 *  - unchanged → mark saved, and write back the trimmed text when trimming.
 */
export function planSaveFinalize(args: {
  snapshotContent: string;
  currentContent: string;
  written: string;
  newMtime: number;
  trim: boolean;
}): SaveFinalizePlan {
  const { snapshotContent, currentContent, written, newMtime, trim } = args;
  if (currentContent !== snapshotContent) {
    return { status: "dirty", mtimeMs: newMtime, errorMessage: null };
  }
  const plan: SaveFinalizePlan = {
    status: "saved",
    mtimeMs: newMtime,
    errorMessage: null,
  };
  if (trim && written !== snapshotContent) plan.content = written;
  return plan;
}
