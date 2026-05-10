import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import {
  codeFolding,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  syntaxHighlighting,
} from "@codemirror/language";
import { search, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { useEffect, useRef } from "react";
import { setActiveSourceView } from "../lib/active-source-view";
import { installImageDrop } from "../lib/image-drop";
import { installImagePaste } from "../lib/image-paste";
import { log as perfLog } from "../lib/perf";
import { installSmartPaste } from "../lib/smart-paste";
import { useAppStore } from "../store";

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

    // Big-file safety net: above 500 KB of source, skip the heavier
    // extensions (line numbers, active-line gutter, syntax highlighting).
    // CodeMirror's virtual scrolling already handles the doc itself; the
    // expensive bit on monster files is repeatedly tokenising as the user
    // scrolls. The user keeps the basic editing keymap + lineWrapping.
    const isHuge = value.length > 500_000;
    const heavyExts = isHuge
      ? []
      : [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          markdown(),
          syntaxHighlighting(defaultHighlightStyle),
          // Fold by heading / fenced code block via lang-markdown's tree
          codeFolding(),
          foldGutter(),
        ];

    const state = EditorState.create({
      doc: value,
      extensions: [
        ...heavyExts,
        history(),
        drawSelection(),
        search({ top: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...foldKeymap]),
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
    setActiveSourceView(view);
    perfLog(
      `source-load[${value.length}b]${isHuge ? " huge" : ""}`,
      performance.now() - t0,
    );

    // Image paste / drop → write to vault, dispatch CM6 transaction
    // inserting the markdown reference at the current selection.
    const insertAtSelection = (md: string) => {
      const v = viewRef.current;
      if (!v) return;
      const { from, to } = v.state.selection.main;
      v.dispatch({
        changes: { from, to, insert: md },
        selection: { anchor: from + md.length },
      });
    };
    const imageOpts = {
      vaultRoot: useAppStore.getState().vaultRoot,
      imageDir: useAppStore.getState().imagePasteDir,
      insert: insertAtSelection,
    };
    const detachPaste = installImagePaste(hostRef.current, imageOpts);
    const detachDrop = installImageDrop(hostRef.current, imageOpts);
    const detachSmart = installSmartPaste(hostRef.current, {
      getSelectionText: () => {
        const v = viewRef.current;
        if (!v) return "";
        const { from, to } = v.state.selection.main;
        return from === to ? "" : v.state.sliceDoc(from, to);
      },
      insertLink: (md) => {
        insertAtSelection(md);
        return true;
      },
    });

    return () => {
      detachPaste();
      detachDrop();
      detachSmart();
      setActiveSourceView(null);
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
