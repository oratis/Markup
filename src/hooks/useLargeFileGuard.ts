import { useEffect, useRef } from "react";

interface TabLike {
  id: string;
  content: string;
}

/** Documents larger than this switch to source mode on open. */
export const LARGE_FILE_LIMIT_BYTES = 5 * 1024 * 1024;

/**
 * Big-file safety net: when a tab whose content exceeds ~5 MB is opened in
 * WYSIWYG mode, invokes `onLargeFile` with the size in MB (1 dp). CodeMirror
 * virtualises huge documents; Milkdown's initial parse + render can stall the
 * main thread, so the caller flips to source mode.
 *
 * Fires once per tab open (keyed on tab id), matching the original effect.
 * The callback is read through a ref so it can be an inline closure without
 * re-running the guard on every render.
 */
export function useLargeFileGuard(
  tab: TabLike | null | undefined,
  sourceMode: boolean,
  onLargeFile: (sizeMb: string) => void,
) {
  const cbRef = useRef(onLargeFile);
  cbRef.current = onLargeFile;
  const tabId = tab?.id;
  useEffect(() => {
    if (!tab) return;
    if (tab.content.length > LARGE_FILE_LIMIT_BYTES && !sourceMode) {
      const mb = (tab.content.length / (1024 * 1024)).toFixed(1);
      cbRef.current(mb);
    }
    // Keyed on tab id only — the original guard fires on tab open, not on
    // every keystroke that changes content length.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);
}
