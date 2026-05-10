import { writeImage } from "./tauri";

interface InsertOpts {
  vaultRoot: string | null;
  /** Where to drop the image, relative to vault root. Default "assets". */
  imageDir?: string;
  /** Insert markdown text at cursor. Receives the relative path. */
  insert: (markdown: string) => void;
}

/**
 * Install a paste handler on `target` that intercepts image clipboard data,
 * writes the image to the vault's `assets/` directory, and inserts a
 * markdown image reference at the cursor.
 *
 * If no vault is open, falls back to native paste (the editor will see the
 * image as base64 — typically becomes nothing or breaks; better to require
 * a vault for image paste).
 */
export function installImagePaste(target: HTMLElement, opts: InsertOpts): () => void {
  const onPaste = async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    let imageItem: DataTransferItem | null = null;
    for (const it of Array.from(items)) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        imageItem = it;
        break;
      }
    }
    if (!imageItem) return;
    e.preventDefault();
    e.stopPropagation();

    const root = opts.vaultRoot;
    if (!root) {
      console.warn("image paste: no vault open; ignoring (open a vault to enable)");
      return;
    }

    const file = imageItem.getAsFile();
    if (!file) return;
    const ext = file.type.split("/")[1] || "png";
    const buf = new Uint8Array(await file.arrayBuffer());

    try {
      const dir = opts.imageDir?.trim() || "assets";
      const rel = await writeImage(root, dir, buf, ext);
      const md = `![](${rel})`;
      opts.insert(md);
    } catch (err) {
      console.error("writeImage failed", err);
    }
  };

  target.addEventListener("paste", onPaste);
  return () => target.removeEventListener("paste", onPaste);
}
