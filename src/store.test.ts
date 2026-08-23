import { beforeEach, describe, expect, it, vi } from "vitest";
import { liveSelection, useAppStore } from "./store";

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
    selectedTabIds: [],
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

  describe("closeTabsToLeft", () => {
    // Opens n tabs named /1.md … /n.md, left to right.
    function openN(n: number) {
      const { openLoadedFile } = useAppStore.getState();
      for (let i = 1; i <= n; i++) {
        openLoadedFile({ path: `/${i}.md`, content: "", mtime_ms: 1 });
      }
    }

    it("removes everything before the pivot, pivot included", () => {
      openN(4);
      useAppStore.getState().closeTabsToLeft("/3.md");
      expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/3.md", "/4.md"]);
    });

    it("keeps pinned tabs on the left", () => {
      openN(3);
      useAppStore.getState().toggleTabPinned("/1.md"); // pinned tabs sort to the front
      useAppStore.getState().closeTabsToLeft("/3.md");
      expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/1.md", "/3.md"]);
    });

    it("on the first tab is a no-op", () => {
      openN(2);
      useAppStore.getState().closeTabsToLeft("/1.md");
      expect(useAppStore.getState().tabs).toHaveLength(2);
    });

    it("activates the pivot when the active tab went with the batch", () => {
      openN(3);
      useAppStore.getState().setActiveTab("/1.md");
      useAppStore.getState().closeTabsToLeft("/3.md");
      expect(useAppStore.getState().activeTabId).toBe("/3.md");
    });
  });

  describe("batch close asks before discarding unsaved work", () => {
    // Opens every path in `paths` and leaves `dirtyPaths` with unsaved edits.
    function openDirty(paths: string[], dirtyPaths: string[]) {
      const s = useAppStore.getState();
      for (const p of paths) s.openLoadedFile({ path: p, content: "v1", mtime_ms: 1 });
      for (const p of dirtyPaths) {
        useAppStore.getState().setActiveTab(p);
        useAppStore.getState().updateActiveContent("edited");
      }
    }

    it("closeOtherTabs asks, and cancelling keeps every tab", () => {
      openDirty(["/a.md", "/b.md", "/c.md"], ["/b.md"]);
      const spy = vi.spyOn(window, "confirm").mockReturnValue(false);
      useAppStore.getState().closeOtherTabs("/a.md");
      expect(spy).toHaveBeenCalledOnce();
      expect(useAppStore.getState().tabs).toHaveLength(3);
      spy.mockRestore();
    });

    it("closeTabsToRight asks, and cancelling keeps every tab", () => {
      openDirty(["/a.md", "/b.md"], ["/b.md"]);
      const spy = vi.spyOn(window, "confirm").mockReturnValue(false);
      useAppStore.getState().closeTabsToRight("/a.md");
      expect(spy).toHaveBeenCalledOnce();
      expect(useAppStore.getState().tabs).toHaveLength(2);
      spy.mockRestore();
    });

    it("names every unsaved doc in the batch, not just the first", () => {
      openDirty(["/a.md", "/b.md", "/c.md"], ["/a.md", "/b.md", "/c.md"]);
      const spy = vi.spyOn(window, "confirm").mockReturnValue(true);
      useAppStore.getState().closeAllTabs();
      const message = String(spy.mock.calls[0][0]);
      expect(message).toContain("a.md");
      expect(message).toContain("b.md");
      expect(message).toContain("c.md");
      spy.mockRestore();
    });

    it("asks once per batch, not once per dirty tab", () => {
      openDirty(["/a.md", "/b.md", "/c.md"], ["/a.md", "/b.md", "/c.md"]);
      const spy = vi.spyOn(window, "confirm").mockReturnValue(true);
      useAppStore.getState().closeAllTabs();
      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });

    it("stays silent when nothing in the batch is dirty", () => {
      openDirty(["/a.md", "/b.md", "/c.md"], []);
      const spy = vi.spyOn(window, "confirm").mockReturnValue(true);
      useAppStore.getState().closeOtherTabs("/a.md");
      expect(spy).not.toHaveBeenCalled();
      expect(useAppStore.getState().tabs).toHaveLength(1);
      spy.mockRestore();
    });

    it("a batch close stacks recentlyClosed left to right, so ⌘⇧T walks back in order", () => {
      openDirty(["/a.md", "/b.md", "/c.md"], []);
      useAppStore.getState().closeAllTabs();
      const { popRecentlyClosed } = useAppStore.getState();
      expect(popRecentlyClosed()).toBe("/a.md");
      expect(popRecentlyClosed()).toBe("/b.md");
      expect(popRecentlyClosed()).toBe("/c.md");
    });

    it("closeOtherTabs still activates the kept tab when everything else is pinned", () => {
      openDirty(["/a.md", "/b.md", "/c.md"], []);
      useAppStore.getState().toggleTabPinned("/a.md");
      useAppStore.getState().toggleTabPinned("/b.md");
      useAppStore.getState().setActiveTab("/a.md");
      useAppStore.getState().closeOtherTabs("/c.md");
      const s = useAppStore.getState();
      expect(s.tabs).toHaveLength(3);
      expect(s.activeTabId).toBe("/c.md");
    });

    it("closeAllTabs lands on the pinned tab nearest the closed ones", () => {
      openDirty(["/a.md", "/b.md", "/c.md", "/d.md"], []);
      useAppStore.getState().toggleTabPinned("/a.md");
      useAppStore.getState().toggleTabPinned("/b.md"); // strip: a* b* c d
      useAppStore.getState().setActiveTab("/c.md");
      useAppStore.getState().closeAllTabs();
      const s = useAppStore.getState();
      expect(s.tabs.map((t) => t.id)).toEqual(["/a.md", "/b.md"]);
      // The left neighbour of the first closed slot — same rule as every
      // other close, so the eye doesn't jump to the far end of the strip.
      expect(s.activeTabId).toBe("/b.md");
    });

    it("closeTabsToLeft asks too, and cancelling keeps every tab", () => {
      openDirty(["/a.md", "/b.md"], ["/a.md"]);
      const spy = vi.spyOn(window, "confirm").mockReturnValue(false);
      useAppStore.getState().closeTabsToLeft("/b.md");
      expect(spy).toHaveBeenCalledOnce();
      expect(useAppStore.getState().tabs).toHaveLength(2);
      spy.mockRestore();
    });

    it("closeTabsToRight lands the active tab on the pivot when it went with the batch", () => {
      openDirty(["/a.md", "/b.md", "/c.md"], []);
      useAppStore.getState().setActiveTab("/c.md");
      useAppStore.getState().closeTabsToRight("/a.md");
      expect(useAppStore.getState().activeTabId).toBe("/a.md");
    });
  });

  describe("closeTabs (an explicit set)", () => {
    // Opens n tabs named /1.md … /n.md, left to right.
    function openN(n: number) {
      const { openLoadedFile } = useAppStore.getState();
      for (let i = 1; i <= n; i++) {
        openLoadedFile({ path: `/${i}.md`, content: "", mtime_ms: 1 });
      }
    }

    it("removes exactly the listed tabs", () => {
      openN(4);
      useAppStore.getState().closeTabs(["/1.md", "/3.md"]);
      expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/2.md", "/4.md"]);
    });

    it("skips pinned tabs in the batch", () => {
      openN(3);
      useAppStore.getState().toggleTabPinned("/2.md");
      useAppStore.getState().closeTabs(["/1.md", "/2.md", "/3.md"]);
      expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/2.md"]);
    });

    it("lands the active tab left of the leftmost closed slot", () => {
      openN(4);
      useAppStore.getState().setActiveTab("/3.md");
      useAppStore.getState().closeTabs(["/2.md", "/3.md"]);
      expect(useAppStore.getState().activeTabId).toBe("/1.md");
    });

    it("keeps the active tab when it isn't in the batch", () => {
      openN(3);
      useAppStore.getState().setActiveTab("/1.md");
      useAppStore.getState().closeTabs(["/2.md", "/3.md"]);
      expect(useAppStore.getState().activeTabId).toBe("/1.md");
    });

    it("falls back to a fresh welcome scratch when it empties the strip", () => {
      openN(2);
      useAppStore.getState().closeTabs(["/1.md", "/2.md"]);
      const s = useAppStore.getState();
      expect(s.tabs).toHaveLength(1);
      expect(s.tabs[0].path).toBeNull();
      expect(s.activeTabId).toBe(s.tabs[0].id);
    });

    it("on an empty / unknown set is a no-op", () => {
      openN(2);
      useAppStore.getState().closeTabs([]);
      useAppStore.getState().closeTabs(["/nope.md"]);
      expect(useAppStore.getState().tabs).toHaveLength(2);
    });

    it("asks before discarding unsaved work in the set", () => {
      openN(2);
      useAppStore.getState().setActiveTab("/1.md");
      useAppStore.getState().updateActiveContent("edited");
      const spy = vi.spyOn(window, "confirm").mockReturnValue(false);
      useAppStore.getState().closeTabs(["/1.md", "/2.md"]);
      expect(spy).toHaveBeenCalledOnce();
      expect(useAppStore.getState().tabs).toHaveLength(2);
      spy.mockRestore();
    });
  });

  describe("tab selection", () => {
    function openN(n: number) {
      const { openLoadedFile } = useAppStore.getState();
      for (let i = 1; i <= n; i++) {
        openLoadedFile({ path: `/${i}.md`, content: "", mtime_ms: 1 });
      }
    }

    it("toggleTabSelection adds then removes", () => {
      openN(2);
      useAppStore.getState().toggleTabSelection("/1.md");
      expect(useAppStore.getState().selectedTabIds).toEqual(["/1.md"]);
      useAppStore.getState().toggleTabSelection("/1.md");
      expect(useAppStore.getState().selectedTabIds).toEqual([]);
    });

    it("refuses pinned tabs — they're exempt from every bulk close", () => {
      openN(2);
      useAppStore.getState().toggleTabPinned("/1.md");
      useAppStore.getState().toggleTabSelection("/1.md");
      expect(useAppStore.getState().selectedTabIds).toEqual([]);
    });

    it("selectTabRange covers the span between anchor and target", () => {
      openN(4);
      useAppStore.getState().selectTabRange("/2.md", "/4.md");
      expect(useAppStore.getState().selectedTabIds).toEqual(["/2.md", "/3.md", "/4.md"]);
    });

    it("selectTabRange works backwards and skips pinned tabs", () => {
      openN(4);
      useAppStore.getState().toggleTabPinned("/3.md"); // pinned sorts to the front
      // Order is now /3, /1, /2, /4 — this range walks all four backwards,
      // and the pinned one must not join the selection.
      useAppStore.getState().selectTabRange("/4.md", "/3.md");
      expect(useAppStore.getState().selectedTabIds).toEqual(["/1.md", "/2.md", "/4.md"]);
    });

    it("selectTabRange with no anchor selects just the target", () => {
      openN(3);
      useAppStore.getState().selectTabRange(null, "/2.md");
      expect(useAppStore.getState().selectedTabIds).toEqual(["/2.md"]);
    });

    it("any close clears the selection", () => {
      openN(3);
      const s = useAppStore.getState();
      s.toggleTabSelection("/1.md");
      s.toggleTabSelection("/2.md");
      expect(useAppStore.getState().selectedTabIds).toHaveLength(2);
      useAppStore.getState().closeTab("/3.md");
      expect(useAppStore.getState().selectedTabIds).toEqual([]);
    });

    it("Save As carries the selection across the tab's id change", () => {
      const { newScratchTab, toggleTabSelection, setActivePathAndName } =
        useAppStore.getState();
      newScratchTab();
      const scratchId = useAppStore.getState().activeTabId as string;
      toggleTabSelection(scratchId);
      setActivePathAndName("/saved.md", "saved.md", 1);
      expect(useAppStore.getState().selectedTabIds).toEqual(["/saved.md"]);
    });

    it("closeSelectedOrActive closes the selection when there is one", () => {
      openN(3);
      useAppStore.getState().setActiveTab("/3.md");
      useAppStore.getState().toggleTabSelection("/1.md");
      useAppStore.getState().closeSelectedOrActive();
      expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/2.md", "/3.md"]);
    });

    it("closeSelectedOrActive ignores a selection the strip isn't showing", () => {
      openN(3);
      useAppStore.getState().setActiveTab("/2.md");
      useAppStore.getState().toggleTabSelection("/1.md");
      useAppStore.setState({ showTabBar: false });
      useAppStore.getState().closeSelectedOrActive();
      // Closed the active tab, not the invisible selection.
      expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/1.md", "/3.md"]);
      useAppStore.setState({ showTabBar: true });
    });

    it("closeSelectedOrActive falls back to the active tab", () => {
      openN(3);
      useAppStore.getState().setActiveTab("/2.md");
      useAppStore.getState().closeSelectedOrActive();
      expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/1.md", "/3.md"]);
    });

    it("pinning a selected tab drops it from the selection", () => {
      openN(3);
      useAppStore.getState().toggleTabSelection("/2.md");
      useAppStore.getState().toggleTabSelection("/3.md");
      useAppStore.getState().toggleTabPinned("/2.md");
      expect(useAppStore.getState().selectedTabIds).toEqual(["/3.md"]);
    });

    it("⌘W never goes dead: a selection of only pinned tabs falls back to the active tab", () => {
      openN(3);
      useAppStore.getState().setActiveTab("/3.md");
      // Force the bad state directly — the store itself no longer produces it.
      useAppStore.getState().toggleTabPinned("/1.md");
      useAppStore.setState({ selectedTabIds: ["/1.md"] });
      useAppStore.getState().closeSelectedOrActive();
      expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/1.md", "/2.md"]);
    });

    it("liveSelection counts only tabs a bulk close would remove", () => {
      openN(3);
      useAppStore.getState().toggleTabPinned("/1.md");
      useAppStore.setState({ selectedTabIds: ["/1.md", "/2.md", "/gone.md"] });
      expect(liveSelection(useAppStore.getState())).toEqual(["/2.md"]);
    });

    it("clearTabSelection empties it", () => {
      openN(2);
      useAppStore.getState().toggleTabSelection("/1.md");
      useAppStore.getState().clearTabSelection();
      expect(useAppStore.getState().selectedTabIds).toEqual([]);
    });
  });
});
