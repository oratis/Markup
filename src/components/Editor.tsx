import { useEffect, useRef } from "react";
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewCtx,
  parserCtx,
} from "@milkdown/core";
import { Slice } from "@milkdown/prose/model";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { history } from "@milkdown/plugin-history";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { clipboard } from "@milkdown/plugin-clipboard";
import { cursor } from "@milkdown/plugin-cursor";
import { indent } from "@milkdown/plugin-indent";
import { math } from "@milkdown/plugin-math";
import { diagram } from "@milkdown/plugin-diagram";
import { nord } from "@milkdown/theme-nord";
import { Milkdown, useEditor } from "@milkdown/react";

interface MarkupEditorProps {
  initialValue: string;
  fileKey: string; // changes when file path changes → triggers reload via useEffect
  onChange: (markdown: string) => void;
}

function InnerEditor({ initialValue, fileKey, onChange }: MarkupEditorProps) {
  // Hold the latest onChange in a ref so the editor factory captures stable refs.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const initialRef = useRef(initialValue);

  const { get } = useEditor((root) =>
    Editor.make()
      .config(nord)
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialRef.current);
        ctx
          .get(listenerCtx)
          .markdownUpdated((_, markdown, prevMarkdown) => {
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
      .use(diagram),
  );

  // When fileKey changes, replace the document instead of recreating the editor.
  useEffect(() => {
    const editor = get();
    if (!editor) return;
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const parser = ctx.get(parserCtx);
      const doc = parser(initialValue);
      if (!doc) return;
      const { state } = view;
      view.dispatch(
        state.tr.replace(
          0,
          state.doc.content.size,
          new Slice(doc.content, 0, 0),
        ),
      );
    });
  }, [fileKey, initialValue, get]);

  return <Milkdown />;
}

export function MarkupEditor(props: MarkupEditorProps) {
  return <InnerEditor {...props} />;
}
