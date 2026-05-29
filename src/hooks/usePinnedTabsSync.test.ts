import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { _resetPinned, getPinnedPaths, persistPinnedPath } from "../lib/pinned-paths";
import { useAppStore } from "../store";
import { usePinnedTabsSync } from "./usePinnedTabsSync";

function makeTab(id: string, path: string | null, pinned?: boolean) {
  return {
    id,
    path,
    name: path ?? "Untitled",
    content: "",
    mtimeMs: null,
    status: "saved" as const,
    errorMessage: null,
    pinned,
  };
}

afterEach(() => {
  _resetPinned();
  localStorage.clear();
  useAppStore.setState({ tabs: [], activeTabId: null });
});

describe("usePinnedTabsSync", () => {
  it("marks tabs pinned on mount when their path is persisted", () => {
    persistPinnedPath("/v/a.md", true);
    useAppStore.setState({ tabs: [makeTab("t1", "/v/a.md"), makeTab("t2", "/v/b.md")] });
    renderHook(() => usePinnedTabsSync(useAppStore.getState().tabs));
    const tabs = useAppStore.getState().tabs;
    expect(tabs.find((t) => t.path === "/v/a.md")?.pinned).toBe(true);
    expect(tabs.find((t) => t.path === "/v/b.md")?.pinned).toBeFalsy();
  });

  it("mirrors a newly-pinned tab back into the persisted set", () => {
    renderHook(() => usePinnedTabsSync([makeTab("t1", "/v/c.md", true)]));
    expect(getPinnedPaths().has("/v/c.md")).toBe(true);
  });

  it("removes an unpinned tab from the persisted set", () => {
    persistPinnedPath("/v/d.md", true);
    renderHook(() => usePinnedTabsSync([makeTab("t1", "/v/d.md", false)]));
    expect(getPinnedPaths().has("/v/d.md")).toBe(false);
  });
});
