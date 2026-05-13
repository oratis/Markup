/**
 * Per-canvas reactive store. One instance per open `.canvas` tab.
 *
 * Pattern: closure-bound state + Set<listener>, matching link-index-store
 * but parameterised (no module-level singleton — each canvas is its own
 * doc with its own undo stack). Registry lives in canvas-registry.ts.
 *
 * History strategy: snapshot the whole `doc` on every mutation and push
 * onto `past`. Undo pops `past` → moves current `doc` to `future`. This
 * trades a little memory (a few KB per snapshot for a typical canvas)
 * for zero risk of inverse-op bugs across the dozen-ish mutation types.
 * Cap `past` at HISTORY_CAP entries (FIFO drop oldest) so a long session
 * doesn't grow without bound.
 *
 * Selection is intentionally NOT part of history — Obsidian doesn't
 * undo selection changes, and conflating them would make Mod+Z feel
 * confusing.
 */

import {
  type CanvasDoc,
  type CanvasEdge,
  type CanvasNode,
  emptyCanvas,
  parseCanvas,
  serializeCanvas,
} from "./canvas-format";

const HISTORY_CAP = 100;

export interface CanvasStoreSnapshot {
  doc: CanvasDoc;
  selection: ReadonlySet<string>;
  canUndo: boolean;
  canRedo: boolean;
}

export interface CanvasStore {
  /** Current snapshot. Reference identity changes on every mutation so
   *  useSyncExternalStore reruns; consumers can compare prev.doc === next.doc. */
  getSnapshot(): CanvasStoreSnapshot;
  subscribe(cb: () => void): () => void;

  // Node mutations (recorded in history)
  addNode(node: CanvasNode): void;
  removeNode(id: string): void;
  updateNode(id: string, patch: Partial<CanvasNode>): void;
  moveNode(id: string, x: number, y: number): void;
  resizeNode(id: string, width: number, height: number): void;

  // Edge mutations (recorded in history)
  addEdge(edge: CanvasEdge): void;
  removeEdge(id: string): void;
  updateEdge(id: string, patch: Partial<CanvasEdge>): void;

  // Bulk delete (records one history entry) — e.g. "Delete selected".
  removeMany(ids: ReadonlyArray<string>): void;

  // Selection (NOT recorded)
  setSelection(ids: ReadonlyArray<string>): void;
  toggleSelection(id: string, additive?: boolean): void;
  clearSelection(): void;

  // History
  undo(): boolean;
  redo(): boolean;

  // Serialisation
  toJson(pretty?: boolean): string;

  /** Replace the doc and clear history. For external-edit reloads. */
  reset(json: string): void;
}

function cloneDoc(doc: CanvasDoc): CanvasDoc {
  // structuredClone is reliable for our value types (objects of strings,
  // numbers, booleans, arrays of same — no functions, no Dates, no Maps).
  return structuredClone(doc);
}

function parseOrEmpty(json: string): CanvasDoc {
  try {
    return parseCanvas(json);
  } catch {
    // Malformed JSON. parseCanvas throws on this; in the store we want
    // to keep the editor alive with an empty canvas rather than crashing.
    return emptyCanvas();
  }
}

/** Create a fresh per-canvas store seeded with the given JSON string.
 *  Malformed JSON falls back to an empty canvas (parseCanvas swallows
 *  shape errors). Initial history is empty. */
export function createCanvasStore(initialJson: string): CanvasStore {
  let doc: CanvasDoc = parseOrEmpty(initialJson);
  let selection: Set<string> = new Set();
  let past: CanvasDoc[] = [];
  let future: CanvasDoc[] = [];
  const listeners = new Set<() => void>();

  function notify() {
    for (const l of listeners) l();
  }

  function pushHistory() {
    past.push(cloneDoc(doc));
    if (past.length > HISTORY_CAP) past.shift();
    future = [];
  }

  function mutateDoc(fn: (d: CanvasDoc) => CanvasDoc): void {
    pushHistory();
    doc = fn(doc);
    notify();
  }

  function snapshot(): CanvasStoreSnapshot {
    return {
      doc,
      selection,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
    };
  }

  return {
    getSnapshot: snapshot,
    subscribe(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },

    addNode(node) {
      mutateDoc((d) => {
        return { ...d, nodes: [...d.nodes, { ...node }] };
      });
    },

    removeNode(id) {
      const exists = doc.nodes.some((n) => n.id === id);
      if (!exists) return;
      mutateDoc((d) => ({
        ...d,
        nodes: d.nodes.filter((n) => n.id !== id),
        // Drop edges that referenced the removed node — leaving dangling
        // refs would corrupt the file on next open.
        edges: d.edges.filter((e) => e.fromNode !== id && e.toNode !== id),
      }));
      // Pull the deleted id out of selection so the UI doesn't keep a
      // selection ring around a non-existent target.
      if (selection.has(id)) {
        const next = new Set(selection);
        next.delete(id);
        selection = next;
      }
    },

    removeMany(ids) {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      const matchesAny =
        doc.nodes.some((n) => idSet.has(n.id)) || doc.edges.some((e) => idSet.has(e.id));
      if (!matchesAny) return;
      mutateDoc((d) => ({
        ...d,
        nodes: d.nodes.filter((n) => !idSet.has(n.id)),
        edges: d.edges.filter(
          (e) => !idSet.has(e.id) && !idSet.has(e.fromNode) && !idSet.has(e.toNode),
        ),
      }));
      const next = new Set(selection);
      for (const id of ids) next.delete(id);
      selection = next;
    },

    updateNode(id, patch) {
      const idx = doc.nodes.findIndex((n) => n.id === id);
      if (idx < 0) return;
      mutateDoc((d) => ({
        ...d,
        nodes: d.nodes.map((n) => (n.id === id ? { ...n, ...patch, id: n.id } : n)),
      }));
    },

    moveNode(id, x, y) {
      const target = doc.nodes.find((n) => n.id === id);
      if (!target) return;
      if (target.x === x && target.y === y) return;
      mutateDoc((d) => ({
        ...d,
        nodes: d.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
      }));
    },

    resizeNode(id, width, height) {
      const target = doc.nodes.find((n) => n.id === id);
      if (!target) return;
      if (target.width === width && target.height === height) return;
      mutateDoc((d) => ({
        ...d,
        nodes: d.nodes.map((n) => (n.id === id ? { ...n, width, height } : n)),
      }));
    },

    addEdge(edge) {
      mutateDoc((d) => ({ ...d, edges: [...d.edges, { ...edge }] }));
    },

    removeEdge(id) {
      const exists = doc.edges.some((e) => e.id === id);
      if (!exists) return;
      mutateDoc((d) => ({
        ...d,
        edges: d.edges.filter((e) => e.id !== id),
      }));
      if (selection.has(id)) {
        const next = new Set(selection);
        next.delete(id);
        selection = next;
      }
    },

    updateEdge(id, patch) {
      const idx = doc.edges.findIndex((e) => e.id === id);
      if (idx < 0) return;
      mutateDoc((d) => ({
        ...d,
        edges: d.edges.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e)),
      }));
    },

    setSelection(ids) {
      selection = new Set(ids);
      notify();
    },

    toggleSelection(id, additive = false) {
      const next = additive ? new Set(selection) : new Set<string>();
      if (selection.has(id) && additive) {
        next.delete(id);
      } else {
        next.add(id);
      }
      selection = next;
      notify();
    },

    clearSelection() {
      if (selection.size === 0) return;
      selection = new Set();
      notify();
    },

    undo() {
      if (past.length === 0) return false;
      const prev = past.pop() as CanvasDoc;
      future.push(cloneDoc(doc));
      if (future.length > HISTORY_CAP) future.shift();
      doc = prev;
      notify();
      return true;
    },

    redo() {
      if (future.length === 0) return false;
      const next = future.pop() as CanvasDoc;
      past.push(cloneDoc(doc));
      if (past.length > HISTORY_CAP) past.shift();
      doc = next;
      notify();
      return true;
    },

    toJson(pretty = true) {
      return serializeCanvas(doc, pretty);
    },

    reset(json) {
      doc = parseOrEmpty(json);
      past = [];
      future = [];
      selection = new Set();
      notify();
    },
  };
}

/** Build an empty store — for "New Canvas" command. */
export function createEmptyCanvasStore(): CanvasStore {
  return createCanvasStore(serializeCanvas(emptyCanvas(), false));
}
