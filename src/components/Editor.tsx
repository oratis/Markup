import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  parserCtx,
  rootCtx,
} from "@milkdown/core";
import { clipboard } from "@milkdown/plugin-clipboard";
import { cursor } from "@milkdown/plugin-cursor";
import { diagram } from "@milkdown/plugin-diagram";
import { history } from "@milkdown/plugin-history";
import { indent } from "@milkdown/plugin-indent";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { math } from "@milkdown/plugin-math";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { Slice } from "@milkdown/prose/model";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { nord } from "@milkdown/theme-nord";
import { getMarkdown } from "@milkdown/utils";
import { useEffect, useRef } from "react";
import { compositionTracker, isComposing } from "../lib/milkdown/composition";
import { embedDecorate } from "../lib/milkdown/embed-deco";
import { imageView } from "../lib/milkdown/image-view";
import { tagDecorate } from "../lib/milkdown/tag-deco";
import { wikilinkDecorate } from "../lib/milkdown/wikilink-deco";
import { log as perfLog } from "../lib/perf";
import { SourceEditor } from "./SourceEditor";

interface MarkupEditorProps {
  initialValue: string;
  fileKey: string;
  sourceMode: boolean;
  /** Read-only viewing surface. When true the Milkdown editor disables
   * contenteditable so the page reads as a static HTML document. */
  readMode?: boolean;
  isDark: boolean;
  onChange: (markdown: string) => void;
}

function WysiwygEditor({
  initialValue,
  fileKey,
  readMode,
  onChange,
}: Omit<MarkupEditorProps, "sourceMode" | "isDark">) {
  // Track the last markdown we emitted out. When `initialValue` prop
  // updates to that same value (because the parent stored what we just
  // emitted), we must NOT replay it into the editor — that would
  // dispatch a REPLACE transaction and jump the cursor to the end of
  // the document.
  const lastEmittedRef = useRef(initialValue);
  const onChangeRef = useRef((md: string) => {
    lastEmittedRef.current = md;
    onChange(md);
  });
  onChangeRef.current = (md: string) => {
    lastEmittedRef.current = md;
    onChange(md);
  };
  const readModeRef = useRef(!!readMode);
  readModeRef.current = !!readMode;
  const initialRef = useRef(initialValue);
  const loadedKeyRef = useRef<string | null>(null);

  const { get } = useEditor((root) =>
    Editor.make()
      .config(nord)
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialRef.current);
        // editable is a closure that reads the ref on every PM
        // re-evaluation, so flipping `readMode` is picked up without a
        // remount or `view.setProps` (which would reset cursor state).
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          editable: () => !readModeRef.current,
        }));
        ctx.get(listenerCtx).markdownUpdated((_, markdown, prevMarkdown) => {
          // Suppress store updates mid-IME-composition: each store write
          // triggers a React re-render that reflows the editor line and
          // visually breaks the composing text (中文输入折行). The final
          // value is flushed once on compositionend (see effect below).
          if (markdown !== prevMarkdown && !isComposing()) {
            onChangeRef.current(markdown);
          }
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .use(clipboard)
      .use(cursor)
      .use(indent)
      .use(math)
      .use(diagram)
      .use(compositionTracker)
      .use(wikilinkDecorate)
      .use(tagDecorate)
      .use(embedDecorate)
      .use(imageView),
  );

  // Insert a real image node when the paste handler (App.tsx) writes a
  // pasted image into the vault. Routed via a window event because the
  // paste handler lives outside this component and has no editor handle.
  //
  // We build the transaction by hand instead of using Milkdown's
  // insertImageCommand because that command appends `.scrollIntoView()`,
  // which yanks the viewport (the cursor appeared to "jump to centre"
  // after a paste). A plain replaceSelectionWith keeps the view put.
  useEffect(() => {
    const onInsertImage = (e: Event) => {
      const ce = e as CustomEvent<{ src: string; alt?: string }>;
      const editor = get();
      if (!editor || !ce.detail?.src) return;
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const imageType = view.state.schema.nodes.image;
        if (!imageType) return;
        const node = imageType.create({
          src: ce.detail.src,
          alt: ce.detail.alt ?? "",
          title: "",
        });
        view.dispatch(view.state.tr.replaceSelectionWith(node));
      });
    };
    window.addEventListener("markup:insert-image", onInsertImage);
    return () => window.removeEventListener("markup:insert-image", onInsertImage);
  }, [get]);

  // Flush the final markdown to the store when an IME composition ends.
  // We suppress markdownUpdated→onChange during composition (above) to
  // avoid mid-composition reflow, so the store would otherwise miss the
  // composed text. Deferred a tick so ProseMirror has committed the
  // compositionend before we serialize.
  useEffect(() => {
    const editor = get();
    if (!editor) return;
    const dom = editor.action((ctx) => ctx.get(editorViewCtx).dom as HTMLElement);
    if (!dom) return;
    const onCompositionEnd = () => {
      setTimeout(() => {
        const ed = get();
        if (!ed) return;
        const md = ed.action(getMarkdown());
        if (typeof md === "string") onChangeRef.current(md);
      }, 0);
    };
    dom.addEventListener("compositionend", onCompositionEnd);
    return () => dom.removeEventListener("compositionend", onCompositionEnd);
  }, [get]);

  // Load content into the editor ONLY when the file changes (tab
  // switch). Within the same file the editor is the source of truth —
  // dispatching a REPLACE on every keystroke (because tab.content
  // round-trips through the store) would jump the cursor to the end of
  // the document. External reloads bump `fileKey` via the parent's
  // ReloadPrompt → setActiveContent flow; not this effect's job.
  useEffect(() => {
    const editor = get();
    if (!editor) return;
    if (loadedKeyRef.current === fileKey) return;
    loadedKeyRef.current = fileKey;
    lastEmittedRef.current = initialValue;
    const t0 = performance.now();
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const parser = ctx.get(parserCtx);
      const doc = parser(initialValue);
      if (!doc) return;
      const { state } = view;
      view.dispatch(
        state.tr.replace(0, state.doc.content.size, new Slice(doc.content, 0, 0)),
      );
    });
    perfLog(`wysiwyg-load[${initialValue.length}b]`, performance.now() - t0);
    // We deliberately exclude `initialValue` from deps so user-driven
    // edits never trigger a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey, get]);

  // Nudge PM to re-evaluate `editable()` when readMode toggles. A no-op
  // transaction is enough; we don't touch `view.setProps`.
  useEffect(() => {
    const editor = get();
    if (!editor) return;
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      view.dispatch(view.state.tr);
    });
    // get is stable from useEditor; keeping it out of deps avoids
    // firing this effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readMode]);

  return <Milkdown />;
}

/**
 * Switches between Milkdown WYSIWYG and CodeMirror 6 source mode.
 *
 * MilkdownProvider must wrap the WYSIWYG variant so its hooks resolve.
 * We mount/unmount the provider with the editor it owns.
 */
export function MarkupEditor(props: MarkupEditorProps) {
  if (props.sourceMode) {
    return (
      <SourceEditor
        value={props.initialValue}
        fileKey={props.fileKey}
        onChange={props.onChange}
        isDark={props.isDark}
      />
    );
  }
  return (
    <MilkdownProvider>
      <WysiwygEditor
        initialValue={props.initialValue}
        fileKey={props.fileKey}
        readMode={props.readMode}
        onChange={props.onChange}
      />
    </MilkdownProvider>
  );
}
