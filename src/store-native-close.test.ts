import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "./store";

vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ confirm: vi.fn() }));

function deferred() {
  let resolve!: (value: boolean) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<boolean>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  useAppStore.setState({
    tabs: [],
    activeTabId: null,
    selectedTabIds: [],
    recentlyClosed: [],
    showTabBar: true,
  });
  for (const path of ["/left.md", "/draft.md", "/right.md"]) {
    useAppStore.getState().openLoadedFile({ path, content: path, mtime_ms: 1 });
  }
  useAppStore
    .getState()
    .patchTab("/draft.md", { status: "dirty", content: "unsaved draft" });
  useAppStore.getState().setActiveTab("/draft.md");
});
afterEach(() => vi.clearAllMocks());

describe("native asynchronous tab-close confirmation", () => {
  const actions = {
    single: () => useAppStore.getState().closeTab("/draft.md"),
    batch: () => useAppStore.getState().closeTabs(["/draft.md"]),
    others: () => useAppStore.getState().closeOtherTabs("/left.md"),
    left: () => useAppStore.getState().closeTabsToLeft("/right.md"),
    right: () => useAppStore.getState().closeTabsToRight("/left.md"),
    all: () => useAppStore.getState().closeAllTabs(),
    shortcut: () => useAppStore.getState().closeSelectedOrActive(),
  };

  it.each(
    Object.entries(actions),
  )("%s waits for Cancel and preserves every tab", async (_name, close) => {
    const answer = deferred();
    vi.mocked(confirm).mockReturnValueOnce(answer.promise);
    const before = useAppStore.getState();
    const pending = close();
    expect(useAppStore.getState()).toBe(before);
    expect(confirm).toHaveBeenCalledOnce();
    answer.resolve(false);
    await pending;
    expect(useAppStore.getState()).toBe(before);
  });

  it("waits for approval, keeps newly opened documents, and suppresses duplicate prompts", async () => {
    const answer = deferred();
    vi.mocked(confirm).mockReturnValueOnce(answer.promise);
    const pending = useAppStore.getState().closeAllTabs();
    useAppStore.getState().closeAllTabs();
    useAppStore
      .getState()
      .openLoadedFile({ path: "/finder.md", content: "new", mtime_ms: 1 });
    expect(confirm).toHaveBeenCalledOnce();
    expect(useAppStore.getState().tabs).toHaveLength(4);
    answer.resolve(true);
    await pending;
    expect(useAppStore.getState().tabs.map((tab) => tab.path)).toEqual(["/finder.md"]);
    expect(useAppStore.getState().activeTabId).toBe("/finder.md");
  });

  it("does not discard content changed while the native dialog was pending", async () => {
    const answer = deferred();
    vi.mocked(confirm).mockReturnValueOnce(answer.promise);
    const pending = useAppStore.getState().closeAllTabs();
    useAppStore.getState().updateActiveContent("a newer draft");
    answer.resolve(true);
    await pending;
    expect(useAppStore.getState().tabs).toHaveLength(3);
    expect(useAppStore.getState().tabs[1].content).toBe("a newer draft");
  });

  it("preserves all documents when the dialog bridge fails and permits a retry", async () => {
    vi.mocked(confirm).mockRejectedValueOnce(new Error("bridge failed"));
    await useAppStore.getState().closeAllTabs();
    expect(useAppStore.getState().tabs).toHaveLength(3);
    vi.mocked(confirm).mockResolvedValueOnce(true);
    await useAppStore.getState().closeAllTabs();
    expect(useAppStore.getState().tabs[0].id).toBe("scratch:welcome");
  });
});
