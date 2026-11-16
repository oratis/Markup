import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasUnsavedChanges, type Tab, useAppStore } from "./store";

beforeEach(() =>
  useAppStore.setState({
    tabs: [],
    activeTabId: null,
    selectedTabIds: [],
    recentlyClosed: [],
  }),
);
afterEach(() => vi.restoreAllMocks());

describe("tab manager close protection", () => {
  it("requires explicit opt-in to close a pinned tab and still confirms its unsaved work", () => {
    const state = useAppStore.getState();
    state.openLoadedFile({ path: "/pinned.md", content: "draft", mtime_ms: 1 });
    state.toggleTabPinned("/pinned.md");
    state.patchTab("/pinned.md", { status: "dirty" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    state.closeTabs(["/pinned.md"]);
    expect(confirm).not.toHaveBeenCalled();
    state.closeTabs(["/pinned.md"], { includePinned: true });
    expect(confirm).toHaveBeenCalledOnce();
    expect(useAppStore.getState().activeTabId).toBe("/pinned.md");
    confirm.mockReturnValue(true);
    state.closeTabs(["/pinned.md"], { includePinned: true });
    expect(useAppStore.getState().tabs[0].id).toBe("scratch:welcome");
    expect(useAppStore.getState().recentlyClosed).toEqual(["/pinned.md"]);
  });

  it("protects scratch drafts without warning on an empty draft or untouched welcome", () => {
    useAppStore.getState().newScratchTab();
    const empty = useAppStore.getState().tabs[0];
    expect(hasUnsavedChanges(empty)).toBe(false);
    useAppStore.getState().updateActiveContent("unsaved draft");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    useAppStore.getState().closeAllTabs();
    expect(confirm).toHaveBeenCalledOnce();
    expect(useAppStore.getState().tabs[0].content).toBe("unsaved draft");
    confirm.mockReturnValue(true);
    useAppStore.getState().closeAllTabs();
    expect(hasUnsavedChanges(useAppStore.getState().tabs[0])).toBe(false);
    useAppStore.getState().updateActiveContent("edited welcome");
    expect(hasUnsavedChanges(useAppStore.getState().tabs[0])).toBe(true);
  });

  it.each([
    "dirty",
    "saving",
    "error",
  ] as Tab["status"][])("protects a %s file", (status) => {
    const state = useAppStore.getState();
    state.openLoadedFile({ path: "/file.md", content: "content", mtime_ms: 1 });
    state.patchTab("/file.md", { status });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    state.closeTabs(["/file.md"]);
    expect(confirm).toHaveBeenCalledOnce();
    expect(useAppStore.getState().tabs[0].path).toBe("/file.md");
  });
});
