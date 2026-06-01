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
    recentlyClosed: [],
    recentVaults: [],
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

  it("pushes recent files with deduplication and 50-cap", () => {
    const { pushRecentFile } = useAppStore.getState();
    for (let i = 0; i < 60; i++) pushRecentFile(`/p${i}.md`);
    const r = useAppStore.getState().recentFiles;
    expect(r.length).toBe(50);
    expect(r[0]).toBe("/p59.md"); // most recent first
    pushRecentFile("/p30.md");
    const r2 = useAppStore.getState().recentFiles;
    expect(r2[0]).toBe("/p30.md");
    // No duplicate
    expect(r2.filter((p) => p === "/p30.md").length).toBe(1);
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

  it("reorderTab moves a tab to the target index", () => {
    const { openLoadedFile, reorderTab } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/c.md", content: "", mtime_ms: 1 });
    reorderTab("/a.md", "/c.md");
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual([
      "/b.md",
      "/c.md",
      "/a.md",
    ]);
  });

  it("reorderTab is a no-op when fromId == toId", () => {
    const { openLoadedFile, reorderTab } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    const before = useAppStore.getState().tabs.map((t) => t.id);
    reorderTab("/a.md", "/a.md");
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(before);
  });

  it("closeOtherTabs leaves only the kept tab and makes it active", () => {
    const { openLoadedFile, closeOtherTabs } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/c.md", content: "", mtime_ms: 1 });
    closeOtherTabs("/b.md");
    const s = useAppStore.getState();
    expect(s.tabs.map((t) => t.id)).toEqual(["/b.md"]);
    expect(s.activeTabId).toBe("/b.md");
  });

  it("closeTabsToRight removes tabs after the given id", () => {
    const { openLoadedFile, closeTabsToRight, setActiveTab } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/c.md", content: "", mtime_ms: 1 });
    setActiveTab("/a.md");
    closeTabsToRight("/a.md");
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/a.md"]);
  });

  it("closeTabsToRight on the last tab is a no-op", () => {
    const { openLoadedFile, closeTabsToRight } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    closeTabsToRight("/b.md");
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/a.md", "/b.md"]);
  });

  it("closeAllTabs returns the store to a fresh welcome scratch", () => {
    const { openLoadedFile, closeAllTabs } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    closeAllTabs();
    const s = useAppStore.getState();
    expect(s.tabs).toHaveLength(1);
    expect(s.tabs[0].path).toBeNull();
    expect(s.activeTabId).toBe(s.tabs[0].id);
  });

  it("toggleTabPinned moves a tab into the pinned group at the front", () => {
    const { openLoadedFile, toggleTabPinned } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/c.md", content: "", mtime_ms: 1 });
    toggleTabPinned("/c.md");
    const ids = useAppStore.getState().tabs.map((t) => t.id);
    expect(ids).toEqual(["/c.md", "/a.md", "/b.md"]);
  });

  it("closeAllTabs preserves pinned tabs", () => {
    const { openLoadedFile, toggleTabPinned, closeAllTabs } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    toggleTabPinned("/a.md");
    closeAllTabs();
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/a.md"]);
  });

  it("closeOtherTabs preserves pinned + the kept tab", () => {
    const { openLoadedFile, toggleTabPinned, closeOtherTabs } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/c.md", content: "", mtime_ms: 1 });
    toggleTabPinned("/a.md");
    closeOtherTabs("/c.md");
    expect(
      useAppStore
        .getState()
        .tabs.map((t) => t.id)
        .sort(),
    ).toEqual(["/a.md", "/c.md"]);
  });

  it("activateNextTab cycles forward and wraps", () => {
    const { openLoadedFile, activateNextTab, setActiveTab } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/c.md", content: "", mtime_ms: 1 });
    setActiveTab("/a.md");
    activateNextTab();
    expect(useAppStore.getState().activeTabId).toBe("/b.md");
    activateNextTab();
    activateNextTab();
    expect(useAppStore.getState().activeTabId).toBe("/a.md");
  });

  it("activatePrevTab cycles backward and wraps", () => {
    const { openLoadedFile, activatePrevTab, setActiveTab } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    setActiveTab("/a.md");
    activatePrevTab();
    expect(useAppStore.getState().activeTabId).toBe("/b.md");
  });

  it("activateTabAt jumps to the tab at the given 0-based index", () => {
    const { openLoadedFile, activateTabAt } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/c.md", content: "", mtime_ms: 1 });
    activateTabAt(1);
    expect(useAppStore.getState().activeTabId).toBe("/b.md");
  });

  it("activateTabAt is a no-op when index is out of range", () => {
    const { openLoadedFile, activateTabAt, setActiveTab } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    setActiveTab("/a.md");
    activateTabAt(99);
    expect(useAppStore.getState().activeTabId).toBe("/a.md");
  });

  it("moveActiveTab swaps the active tab with its neighbour", () => {
    const { openLoadedFile, moveActiveTab, setActiveTab } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/c.md", content: "", mtime_ms: 1 });
    setActiveTab("/b.md");
    moveActiveTab("right");
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual([
      "/a.md",
      "/c.md",
      "/b.md",
    ]);
    moveActiveTab("left");
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual([
      "/a.md",
      "/b.md",
      "/c.md",
    ]);
  });

  it("moveActiveTabToEdge moves to the first/last slot in the same pin group", () => {
    const { openLoadedFile, moveActiveTabToEdge, setActiveTab } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/c.md", content: "", mtime_ms: 1 });
    setActiveTab("/b.md");
    moveActiveTabToEdge("first");
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual([
      "/b.md",
      "/a.md",
      "/c.md",
    ]);
    moveActiveTabToEdge("last");
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual([
      "/a.md",
      "/c.md",
      "/b.md",
    ]);
  });

  it("moveActiveTab refuses to cross the pinned/unpinned boundary", () => {
    const { openLoadedFile, toggleTabPinned, moveActiveTab, setActiveTab } =
      useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    toggleTabPinned("/a.md");
    setActiveTab("/b.md");
    moveActiveTab("left");
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/a.md", "/b.md"]);
  });

  it("closeTab pushes the path onto recentlyClosed; popRecentlyClosed returns it", () => {
    const { openLoadedFile, closeTab, popRecentlyClosed } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    closeTab("/a.md");
    closeTab("/b.md");
    // Newest closed comes off the stack first.
    expect(popRecentlyClosed()).toBe("/b.md");
    expect(popRecentlyClosed()).toBe("/a.md");
    expect(popRecentlyClosed()).toBeNull();
  });

  it("closeAllTabs records every closed file path on recentlyClosed", () => {
    const { openLoadedFile, closeAllTabs, popRecentlyClosed } = useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/b.md", content: "", mtime_ms: 1 });
    openLoadedFile({ path: "/c.md", content: "", mtime_ms: 1 });
    closeAllTabs();
    const popped: string[] = [];
    let p = popRecentlyClosed();
    while (p) {
      popped.push(p);
      p = popRecentlyClosed();
    }
    expect(popped.sort()).toEqual(["/a.md", "/b.md", "/c.md"]);
  });

  it("scratch tabs (no path) don't pollute recentlyClosed", () => {
    const { newScratchTab, closeTab, popRecentlyClosed } = useAppStore.getState();
    newScratchTab();
    const id = useAppStore.getState().activeTabId!;
    closeTab(id);
    expect(popRecentlyClosed()).toBeNull();
  });

  it("pushRecentVault dedupes and caps to the 10 most recent", () => {
    const { pushRecentVault } = useAppStore.getState();
    for (let i = 0; i < 12; i++) pushRecentVault(`/v/${i}`);
    pushRecentVault("/v/3");
    const list = useAppStore.getState().recentVaults;
    expect(list).toHaveLength(10);
    expect(list[0]).toBe("/v/3");
    // /v/0 and /v/1 fell off the end (oldest); /v/3 deduped to the front.
    expect(list).not.toContain("/v/0");
  });

  it("reloadActiveFromDisk swaps content + mtime and clears dirty status", () => {
    const { openLoadedFile, updateActiveContent, reloadActiveFromDisk } =
      useAppStore.getState();
    openLoadedFile({ path: "/a.md", content: "v1", mtime_ms: 100 });
    updateActiveContent("v1 + edit");
    expect(useAppStore.getState().tabs[0].status).toBe("dirty");
    reloadActiveFromDisk("v2 from disk", 200);
    const t0 = useAppStore.getState().tabs[0];
    expect(t0.content).toBe("v2 from disk");
    expect(t0.mtimeMs).toBe(200);
    expect(t0.status).toBe("saved");
    expect(t0.errorMessage).toBeNull();
  });

  it("setActivePathAndName updates id/path/name/mtime + clears dirty", () => {
    const { newScratchTab, updateActiveContent, setActivePathAndName } =
      useAppStore.getState();
    newScratchTab();
    updateActiveContent("hello");
    setActivePathAndName("/saved.md", "saved.md", 12345);
    const t = useAppStore.getState().tabs.find((x) => x.id === "/saved.md");
    expect(t).toBeDefined();
    expect(t?.path).toBe("/saved.md");
    expect(t?.name).toBe("saved.md");
    expect(t?.mtimeMs).toBe(12345);
    expect(t?.status).toBe("saved");
  });

  describe("tab kind discriminant", () => {
    it("marks a .canvas tab with kind=canvas on open", () => {
      const { openLoadedFile } = useAppStore.getState();
      openLoadedFile({
        path: "/notes/board.canvas",
        content: "{}",
        mtime_ms: 100,
      });
      const tab = useAppStore
        .getState()
        .tabs.find((x) => x.path === "/notes/board.canvas");
      expect(tab?.kind).toBe("canvas");
    });

    it("marks a .md tab with kind=markdown on open", () => {
      const { openLoadedFile } = useAppStore.getState();
      openLoadedFile({
        path: "/notes/foo.md",
        content: "# Hi",
        mtime_ms: 100,
      });
      const tab = useAppStore.getState().tabs.find((x) => x.path === "/notes/foo.md");
      expect(tab?.kind).toBe("markdown");
    });

    it("marks a .html tab with kind=html on open", () => {
      const { openLoadedFile } = useAppStore.getState();
      openLoadedFile({
        path: "/notes/page.html",
        content: "<h1>Hi</h1>",
        mtime_ms: 100,
      });
      const tab = useAppStore.getState().tabs.find((x) => x.path === "/notes/page.html");
      expect(tab?.kind).toBe("html");
    });

    it("matches the .canvas extension case-insensitively", () => {
      const { openLoadedFile } = useAppStore.getState();
      openLoadedFile({
        path: "/notes/Mixed.Canvas",
        content: "{}",
        mtime_ms: 100,
      });
      const tab = useAppStore
        .getState()
        .tabs.find((x) => x.path === "/notes/Mixed.Canvas");
      expect(tab?.kind).toBe("canvas");
    });
  });
});
