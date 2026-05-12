import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
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
import { useEffect, useRef } from "react";
import { tagDecorate } from "../lib/milkdown/tag-deco";
import { wikilinkDecorate } from "../lib/milkdown/wikilink-deco";
import { log as perfLog } from "../lib/perf";
import { SourceEditor } from "./SourceEditor";

interface MarkupEditorProps {
  initialValue: string;
  fileKey: string;
  sourceMode: boolean;
  isDark: boolean;
  onChange: (markdown: string) => void;
}

function WysiwygEditor({
  initialValue,
  fileKey,
  onChange,
}: Omit<MarkupEditorProps, "sourceMode" | "isDark">) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialRef = useRef(initialValue);

  const { get } = useEditor((root) =>
    Editor.make()
      .config(nord)
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialRef.current);
        ctx.get(listenerCtx).markdownUpdated((_, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) onChangeRef.current(markdown);
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
      .use(wikilinkDecorate)
      .use(tagDecorate),
  );

  useEffect(() => {
    const editor = get();
    if (!editor) return;
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
  }, [fileKey, initialValue, get]);

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
        onChange={props.onChange}
      />
    </MilkdownProvider>
  );
}
