import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, search } from "@codemirror/search";
import { markdown } from "@codemirror/lang-markdown";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { log as perfLog } from "../lib/perf";

interface SourceEditorProps {
  value: string;
  fileKey: string;
  onChange: (next: string) => void;
  isDark?: boolean;
}

export function SourceEditor({ value, fileKey, onChange, isDark }: SourceEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;
    const t0 = performance.now();
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        drawSelection(),
        search({ top: true }),
        markdown(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            onChangeRef.current(u.state.doc.toString());
          }
        }),
        ...(isDark ? [oneDark] : []),
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    perfLog(`source-load[${value.length}b]`, performance.now() - t0);
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Recreate on file or theme change to avoid mismatched extensions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey, isDark]);

  // External value updates while editing in another tab/source: replace doc only
  // when it diverges from current state, to avoid clobbering active typing.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value, fileKey]);

  return (
    <div
      ref={hostRef}
      className="h-full w-full font-mono text-[13px] leading-[1.6] overflow-auto"
    />
  );
}
