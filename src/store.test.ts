import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "./store";

function reset() {
  // Re-create the store's initial state by closing all tabs except welcome
  const s = useAppStore.getState();
  for (const t of [...s.tabs]) if (t.id !== "scratch:welcome") s.closeTab(t.id);
  useAppStore.setState({
    activeTabId: "scratch:welcome",
    vaultRoot: null,
    vaultFiles: [],
    sourceMode: false,
    theme: "light",
    sidebarOpen: false,
    outlineOpen: false,
    focusMode: false,
    typewriterMode: false,
    recentFiles: [],
  });
}

describe("app store", () => {
  beforeEach(reset);

  it("opens a loaded file as a new tab and replaces welcome on first open", () => {
    const { openLoadedFile } = useAppStore.getState();
    openLoadedFile({
      path: "/notes/foo.md",
      content: "# foo",
      mtime_ms: 100,
    });
    const s = useAppStore.getState();
    expect(s.activeTabId).toBe("/notes/foo.md");
    expect(s.tabs.map((t) => t.id)).toContain("/notes/foo.md");
    // Welcome was the only tab; it should drop on first real open
    expect(s.tabs.find((t) => t.id === "scratch:welcome")).toBeUndefined();
  });

  it("does not duplicate when opening the same path twice", () => {
    const { openLoadedFile } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "1", mtime_ms: 1 });
    openLoadedFile({ path: "/a.md", content: "1", mtime_ms: 1 });
    const s = useAppStore.getState();
    expect(s.tabs.filter((t) => t.id === "/a.md").length).toBe(1);
  });

  it("marks active tab dirty on content update for real files only", () => {
    const { openLoadedFile, updateActiveContent } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "1", mtime_ms: 1 });
    updateActiveContent("changed");
    expect(useAppStore.getState().tabs.find((t) => t.id === "/a.md")?.status).toBe(
      "dirty",
    );
  });

  it("does not mark scratch buffer dirty on content update", () => {
    const { newScratchTab, updateActiveContent } = useAppStore.getState();
    newScratchTab();
    const id = useAppStore.getState().activeTabId;
    updateActiveContent("hello");
    const t = useAppStore.getState().tabs.find((x) => x.id === id);
    expect(t?.status).toBe("saved");
  });

  it("pushes recent files with deduplication and 20-cap", () => {
    const { pushRecentFile } = useAppStore.getState();
    for (let i = 0; i < 25; i++) pushRecentFile(`/p${i}.md`);
    const r = useAppStore.getState().recentFiles;
    expect(r.length).toBe(20);
    expect(r[0]).toBe("/p24.md"); // most recent first
    pushRecentFile("/p10.md");
    const r2 = useAppStore.getState().recentFiles;
    expect(r2[0]).toBe("/p10.md");
    // No duplicate
    expect(r2.filter((p) => p === "/p10.md").length).toBe(1);
  });

  it("toggles boolean view flags", () => {
    const s = useAppStore.getState();
    expect(s.sourceMode).toBe(false);
    s.toggleSourceMode();
    expect(useAppStore.getState().sourceMode).toBe(true);
    s.toggleFocusMode();
    expect(useAppStore.getState().focusMode).toBe(true);
  });

  it("closeTab(dirty) without confirm cancels close", () => {
    const { openLoadedFile, updateActiveContent, closeTab } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "1", mtime_ms: 1 });
    updateActiveContent("changed");
    const spy = vi.spyOn(window, "confirm").mockReturnValue(false);
    closeTab("/a.md");
    expect(spy).toHaveBeenCalledOnce();
    expect(useAppStore.getState().tabs.find((t) => t.id === "/a.md")).toBeDefined();
    spy.mockRestore();
  });

  it("closeTab(dirty) with confirm closes the tab", () => {
    const { openLoadedFile, updateActiveContent, closeTab } = useAppStore.getState();
    openLoadedFile({ path: "/b.md", content: "1", mtime_ms: 1 });
    updateActiveContent("changed");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    closeTab("/b.md");
    expect(useAppStore.getState().tabs.find((t) => t.id === "/b.md")).toBeUndefined();
  });
});
