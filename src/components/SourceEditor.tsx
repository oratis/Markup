import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import {
  bracketMatching,
  codeFolding,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  syntaxHighlighting,
} from "@codemirror/language";
import { search, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState } from "@codemirror/state";
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
import { autoClosePairs } from "../lib/cm-auto-close";
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
  const wrapCompartmentRef = useRef<Compartment | null>(null);
  const lineNoCompartmentRef = useRef<Compartment | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lineWrap = useAppStore((s) => s.lineWrap);
  const showLineNumbers = useAppStore((s) => s.showLineNumbers);

  useEffect(() => {
    if (!hostRef.current) return;
    const t0 = performance.now();

    // Big-file safety net: above 500 KB of source, skip the heavier
    // extensions (line numbers, active-line gutter, syntax highlighting).
    // CodeMirror's virtual scrolling already handles the doc itself; the
    // expensive bit on monster files is repeatedly tokenising as the user
    // scrolls. The user keeps the basic editing keymap + lineWrapping.
    const isHuge = value.length > 500_000;
    const wrapCompartment = new Compartment();
    wrapCompartmentRef.current = wrapCompartment;
    const lineNoCompartment = new Compartment();
    lineNoCompartmentRef.current = lineNoCompartment;
    const initialLineWrap = useAppStore.getState().lineWrap;
    const initialShowLineNumbers = useAppStore.getState().showLineNumbers && !isHuge;

    // The "heavy" markdown highlight + folding stack stays static — it's
    // tied to the file (ie. recreated on fileKey change). Line numbers
    // + their active-line gutter live in their own Compartment so the
    // user can flip them on / off without recreating the editor.
    const heavyExts = isHuge
      ? []
      : [
          highlightActiveLine(),
          markdown(),
          syntaxHighlighting(defaultHighlightStyle),
          codeFolding(),
          foldGutter(),
          bracketMatching(),
          autoClosePairs(),
        ];

    const state = EditorState.create({
      doc: value,
      extensions: [
        ...heavyExts,
        lineNoCompartment.of(
          initialShowLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : [],
        ),
        history(),
        drawSelection(),
        search({ top: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...foldKeymap]),
        wrapCompartment.of(initialLineWrap ? EditorView.lineWrapping : []),
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

  // Live-toggle soft line wrapping without recreating the editor.
  useEffect(() => {
    const view = viewRef.current;
    const compartment = wrapCompartmentRef.current;
    if (!view || !compartment) return;
    view.dispatch({
      effects: compartment.reconfigure(lineWrap ? EditorView.lineWrapping : []),
    });
  }, [lineWrap]);

  // Live-toggle line numbers + active-line gutter via Compartment. Big
  // files keep them off (the heavy-extension fast path also disables
  // highlight + markdown lang to keep input latency low).
  useEffect(() => {
    const view = viewRef.current;
    const compartment = lineNoCompartmentRef.current;
    if (!view || !compartment) return;
    view.dispatch({
      effects: compartment.reconfigure(
        showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : [],
      ),
    });
  }, [showLineNumbers]);

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
