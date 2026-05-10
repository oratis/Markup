import { writeImage } from "./tauri";

interface InsertOpts {
  vaultRoot: string | null;
  imageDir?: string;
  /** Insert markdown text at cursor / drop point. Receives the relative path. */
  insert: (markdown: string) => void;
  /**
   * Optional handler for dropped *markdown* files (.md, .markdown, .mdx, .mkd).
   * If provided and the dropped file is recognised, it's invoked with an
   * absolute path; image processing is skipped. The path comes from
   * Tauri's File.path attribute (Tauri 2 attaches it to the FileSystemFileHandle
   * polyfill via the file's name when present).
   */
  onMarkdownDrop?: (file: File) => void;
}

/**
 * Install a drop handler on `target` that intercepts dragged image files,
 * writes them to {vault}/{imageDir}/, and inserts a markdown image
 * reference at the current selection. Mirrors `installImagePaste` for the
 * drag-and-drop path; the two share the same Tauri write_image command.
 *
 * If no vault is open, lets the native drop happen (no preventDefault), so
 * the editor can still attempt its default behaviour.
 */
export function installImageDrop(target: HTMLElement, opts: InsertOpts): () => void {
  const onDragOver = (e: DragEvent) => {
    if (!hasImageFile(e.dataTransfer)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };

  const onDrop = async (e: DragEvent) => {
    const dt = e.dataTransfer;
    if (!dt || !dt.types.includes("Files")) return;

    const files = Array.from(dt.files);

    // Markdown files take precedence over image fallthrough — opening a
    // dropped .md is more useful than embedding it as an image link.
    if (opts.onMarkdownDrop) {
      const md = files.find((f) => /\.(md|markdown|mdx|mkd)$/i.test(f.name));
      if (md) {
        e.preventDefault();
        e.stopPropagation();
        opts.onMarkdownDrop(md);
        return;
      }
    }

    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    e.preventDefault();
    e.stopPropagation();

    const root = opts.vaultRoot;
    if (!root) {
      console.warn("image drop: no vault open; ignoring");
      return;
    }

    const dir = opts.imageDir?.trim() || "assets";
    for (const file of images) {
      const ext = file.type.split("/")[1] || "png";
      const buf = new Uint8Array(await file.arrayBuffer());
      try {
        const rel = await writeImage(root, dir, buf, ext);
        opts.insert(`![](${rel})`);
      } catch (err) {
        console.error("writeImage failed", err);
      }
    }
  };

  target.addEventListener("dragover", onDragOver);
  target.addEventListener("drop", onDrop);
  return () => {
    target.removeEventListener("dragover", onDragOver);
    target.removeEventListener("drop", onDrop);
  };
}

function hasImageFile(dt: DataTransfer | null | undefined): boolean {
  if (!dt) return false;
  // dataTransfer.files isn't populated until drop, but `types` includes "Files"
  // when dragging anything from Finder. The actual filtering happens in onDrop.
  if (dt.types && Array.from(dt.types).includes("Files")) return true;
  return false;
}
