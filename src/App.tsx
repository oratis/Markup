import { useCallback, useEffect, useRef } from "react";
import { MilkdownProvider } from "@milkdown/react";
import { Toolbar } from "./components/Toolbar";
import { MarkupEditor } from "./components/Editor";
import { useAppStore } from "./store";
import { writeFile } from "./lib/tauri";

const WELCOME_MD = `# Welcome to Markup

Markup is a high-performance Markdown editor for macOS.

## Try it out

- Type some **markdown**
- Use \`Cmd+O\` (or click *Open…*) to open a \`.md\` file
- Edits autosave 300ms after you stop typing

### Math (KaTeX)

Inline: $a^2 + b^2 = c^2$

Block:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$

### Diagram (Mermaid)

\`\`\`mermaid
graph LR
    A[Open file] --> B[Edit in WYSIWYG]
    B --> C{Dirty?}
    C -->|Yes| D[Autosave]
    C -->|No| E[Idle]
\`\`\`

### Code

\`\`\`ts
function hello(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

> **Spike 0.1** verifies that this rich content renders, edits, and round-trips
> through the file system.
`;

const SAVE_DEBOUNCE_MS = 300;

export function App() {
  const file = useAppStore((s) => s.file);
  const setStatus = useAppStore((s) => s.setStatus);
  const setMtime = useAppStore((s) => s.setMtime);

  const lastEditedContentRef = useRef<string>(WELCOME_MD);
  const saveTimerRef = useRef<number | null>(null);

  const performSave = useCallback(async () => {
    const f = useAppStore.getState().file;
    if (!f) return;
    const content = lastEditedContentRef.current;
    setStatus("saving");
    try {
      const newMtime = await writeFile(f.path, content, f.mtime_ms);
      setMtime(newMtime);
      setStatus("saved");
    } catch (err) {
      console.error("write_file failed", err);
      setStatus("error", String(err));
    }
  }, [setMtime, setStatus]);

  const handleEditorChange = useCallback(
    (markdown: string) => {
      lastEditedContentRef.current = markdown;
      const f = useAppStore.getState().file;
      if (!f) return; // welcome doc — don't save
      setStatus("dirty");
      if (saveTimerRef.current !== null)
        window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(performSave, SAVE_DEBOUNCE_MS);
    },
    [performSave, setStatus],
  );

  // ⌘S — manual save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (saveTimerRef.current !== null) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        performSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [performSave]);

  // Reset content ref whenever the active file changes
  useEffect(() => {
    if (file) lastEditedContentRef.current = file.content;
    else lastEditedContentRef.current = WELCOME_MD;
  }, [file]);

  const fileKey = file?.path ?? "__welcome__";
  const initialValue = file?.content ?? WELCOME_MD;

  return (
    <div className="flex flex-col h-full">
      <Toolbar />
      <main className="flex-1 overflow-auto">
        <MilkdownProvider>
          <MarkupEditor
            fileKey={fileKey}
            initialValue={initialValue}
            onChange={handleEditorChange}
          />
        </MilkdownProvider>
      </main>
    </div>
  );
}
