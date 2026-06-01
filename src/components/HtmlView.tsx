import { convertFileSrc } from "@tauri-apps/api/core";
import { SourceEditor } from "./SourceEditor";

interface HtmlViewProps {
  /** Absolute path to the .html file (for the asset-protocol preview). */
  path: string;
  /** The file's current text (for source editing). */
  content: string;
  fileKey: string;
  /** True in read mode → render; false → edit the HTML source. */
  readMode: boolean;
  isDark: boolean;
  onChange: (next: string) => void;
}

/**
 * Renders a standalone `.html` document.
 *
 * - **Read mode**: loads the real file through Tauri's asset protocol in a
 *   sandboxed `<iframe>`, so relative CSS / images / links resolve and the page
 *   renders faithfully (the desktop analog of iOS's `loadFileURL`).
 * - **Edit mode**: shows the raw HTML in the CodeMirror source editor.
 */
export function HtmlView({
  path,
  content,
  fileKey,
  readMode,
  isDark,
  onChange,
}: HtmlViewProps) {
  if (readMode) {
    return (
      <iframe
        title="HTML preview"
        src={convertFileSrc(path)}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        className="w-full h-full border-0 bg-white"
      />
    );
  }
  return (
    <SourceEditor value={content} fileKey={fileKey} onChange={onChange} isDark={isDark} />
  );
}
