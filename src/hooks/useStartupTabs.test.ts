import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LoadedFile } from "../lib/types";

/** Resolves `readFile` on demand so a test can control who finishes last. */
const files = new Map<string, LoadedFile>();
const slow = new Set<string>();
const gates: Array<() => void> = [];
let pending: string[] = [];
let liveOpen: ((paths: string[]) => void) | null = null;
const unlisten = vi.fn();

vi.mock("../lib/tauri", () => ({
  readFile: async (path: string): Promise<LoadedFile> => {
    if (slow.has(path)) await new Promise<void>((r) => gates.push(r));
    const f = files.get(path);
    if (!f) throw new Error(`no such file: ${path}`);
    return f;
  },
  takePendingFiles: async () => pending,
  listenOpenFiles: async (cb: (paths: string[]) => void) => {
    liveOpen = cb;
    return unlisten;
  },
}));

import { _resetSession, writeSession } from "../lib/session";
import { WELCOME_TAB_ID, useAppStore } from "../store";
import { useStartupTabs } from "./useStartupTabs";

function seed(path: string, content = `# ${path}`) {
  files.set(path, { path, content, mtime_ms: 1 });
}

/** Wait for a `readFile` to park on the slow gate, then let it through. */
async function releaseSlowReads() {
  await waitFor(() => expect(gates.length).toBeGreaterThan(0));
  while (gates.length > 0) gates.shift()?.();
}

beforeEach(() => {
  files.clear();
  slow.clear();
  gates.length = 0;
  pending = [];
  liveOpen = null;
  _resetSession();
  useAppStore.setState({
    tabs: [
      {
        id: WELCOME_TAB_ID,
        path: null,
        name: "Welcome",
        content: "",
        mtimeMs: null,
        status: "saved",
        errorMessage: null,
      },
    ],
    activeTabId: WELCOME_TAB_ID,
  });
});

afterEach(() => {
  _resetSession();
});

describe("useStartupTabs", () => {
  it("keeps focus on the file the OS asked for, even when the session restores later", async () => {
    // The regression: a big file in last session's tabs meant the restore
    // finished after the Finder open and stole `activeTabId` back.
    seed("/v/old.md");
    seed("/v/new.md");
    slow.add("/v/old.md");
    writeSession({ open: ["/v/old.md"], active: "/v/old.md" });
    pending = ["/v/new.md"];

    renderHook(() => useStartupTabs());

    await waitFor(() => expect(useAppStore.getState().activeTabId).toBe("/v/new.md"));
    await releaseSlowReads();
    await waitFor(() =>
      expect(useAppStore.getState().tabs.map((t) => t.id)).toContain("/v/old.md"),
    );
    // Restored in the background — the requested file keeps the screen.
    expect(useAppStore.getState().activeTabId).toBe("/v/new.md");
  });

  it("restores last session's active tab when nothing else was opened", async () => {
    seed("/v/a.md");
    seed("/v/b.md");
    writeSession({ open: ["/v/a.md", "/v/b.md"], active: "/v/b.md" });

    renderHook(() => useStartupTabs());

    await waitFor(() => expect(useAppStore.getState().activeTabId).toBe("/v/b.md"));
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/v/a.md", "/v/b.md"]);
  });

  it("lands on a real tab when the session's active file is gone", async () => {
    seed("/v/a.md");
    // /v/gone.md is in the session but no longer readable.
    writeSession({ open: ["/v/a.md", "/v/gone.md"], active: "/v/gone.md" });

    renderHook(() => useStartupTabs());

    await waitFor(() =>
      expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/v/a.md"]),
    );
    // Not left pointing at a tab that does not exist (which renders blank).
    expect(useAppStore.getState().activeTabId).toBe("/v/a.md");
  });

  it("a live open while the session is still loading wins the focus", async () => {
    seed("/v/old.md");
    seed("/v/live.md");
    slow.add("/v/old.md");
    writeSession({ open: ["/v/old.md"], active: "/v/old.md" });

    renderHook(() => useStartupTabs());

    await waitFor(() => expect(liveOpen).not.toBeNull());
    liveOpen?.(["/v/live.md"]);
    await waitFor(() => expect(useAppStore.getState().activeTabId).toBe("/v/live.md"));
    await releaseSlowReads();
    await waitFor(() =>
      expect(useAppStore.getState().tabs.map((t) => t.id)).toContain("/v/old.md"),
    );
    expect(useAppStore.getState().activeTabId).toBe("/v/live.md");
  });

  it("reports what it restored and what it opened", async () => {
    seed("/v/a.md");
    seed("/v/new.md");
    writeSession({ open: ["/v/a.md"], active: "/v/a.md" });
    pending = ["/v/new.md"];
    const onRestored = vi.fn();
    const onOpened = vi.fn();

    renderHook(() => useStartupTabs({ onRestored, onOpened }));

    await waitFor(() => expect(onRestored).toHaveBeenCalledWith(1));
    expect(onOpened).toHaveBeenCalledWith("/v/new.md");
  });
});
