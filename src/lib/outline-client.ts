import type { Heading } from "./outline-worker";

/**
 * Single shared worker instance for outline parsing. We use Vite's
 * `?worker&inline` query so the worker code is bundled and bootable
 * without a separate fetch.
 *
 * For tiny docs the worker round-trip costs more than parsing inline;
 * the caller should keep an inline-fallback path and only delegate when
 * the doc exceeds a threshold (see components/Outline.tsx).
 */
let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (h: Heading[]) => void>();

function ensureWorker(): Worker {
  if (worker) return worker;
  // Vite-specific: the URL with `import.meta.url` is rewritten at build time.
  worker = new Worker(new URL("./outline-worker.ts", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (e: MessageEvent<{ id: number; headings: Heading[] }>) => {
    const cb = pending.get(e.data.id);
    if (cb) {
      pending.delete(e.data.id);
      cb(e.data.headings);
    }
  };
  worker.onerror = () => {
    // Drop pending callbacks rather than hang forever.
    for (const [, cb] of pending) cb([]);
    pending.clear();
  };
  return worker;
}

export function parseHeadingsAsync(text: string): Promise<Heading[]> {
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    ensureWorker().postMessage({ id, text });
  });
}
