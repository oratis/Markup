/**
 * Registry of live CanvasStore instances keyed by tab id.
 *
 * Each open `.canvas` tab gets its own store (with its own undo stack).
 * When the tab closes, App.tsx must call `disposeCanvasStore(tabId)` to
 * release the store — otherwise memory grows linearly with every canvas
 * ever opened during a session.
 *
 * Singleton at the module level on purpose: React components (CanvasView,
 * undo/redo command palette entries, status bar) all need to find the
 * store for the active tab without prop-drilling.
 */

import { type CanvasStore, createCanvasStore } from "./canvas-store";

const stores = new Map<string, CanvasStore>();

/** Return the existing store for this tab, or create a new one seeded
 *  with the given JSON. Subsequent calls with the same tabId return the
 *  same instance (the `initialJson` argument is ignored on hit). */
export function getOrCreateCanvasStore(tabId: string, initialJson: string): CanvasStore {
  const existing = stores.get(tabId);
  if (existing) return existing;
  const store = createCanvasStore(initialJson);
  stores.set(tabId, store);
  return store;
}

/** Look up an existing store without creating one. */
export function getCanvasStore(tabId: string): CanvasStore | undefined {
  return stores.get(tabId);
}

/** Release the store for a closed tab. No-op when nothing is registered. */
export function disposeCanvasStore(tabId: string): void {
  stores.delete(tabId);
}

/** When a tab is renamed (Save As, or path change), the key needs to
 *  migrate or the new tab id would create a fresh empty store. */
export function renameCanvasStore(oldTabId: string, newTabId: string): void {
  if (oldTabId === newTabId) return;
  const store = stores.get(oldTabId);
  if (!store) return;
  stores.delete(oldTabId);
  stores.set(newTabId, store);
}

/** For tests. */
export function _resetCanvasRegistry(): void {
  stores.clear();
}

/** For tests / debug UI. */
export function _canvasRegistrySize(): number {
  return stores.size;
}
