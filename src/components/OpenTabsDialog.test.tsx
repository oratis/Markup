import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLocale } from "../lib/i18n";
import * as confirmation from "../lib/confirm-discard";
import { type Tab, useAppStore } from "../store";
import { OpenTabsDialog } from "./OpenTabsDialog";

function tab(path: string, extra: Partial<Tab> = {}): Tab {
  return {
    id: path,
    path,
    name: path.split("/").pop()!,
    content: "# Note",
    status: "saved",
    mtimeMs: 1,
    errorMessage: null,
    ...extra,
  };
}

beforeEach(() => {
  setLocale("en");
  useAppStore.setState({
    tabs: [tab("/work/README.md"), tab("/personal/README.md"), tab("/笔记/中文 空格.md")],
    activeTabId: "/work/README.md",
    selectedTabIds: [],
    recentlyClosed: [],
  });
});
afterEach(() => vi.restoreAllMocks());

describe("OpenTabsDialog", () => {
  it("finds duplicate names by path and switches without reloading unsaved content", () => {
    useAppStore.setState({
      tabs: [
        tab("/work/README.md"),
        tab("/personal/README.md", { status: "dirty", content: "unsaved work" }),
      ],
      selectedTabIds: ["/work/README.md"],
    });
    const onClose = vi.fn();
    render(<OpenTabsDialog onClose={onClose} />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "personal/readme" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(useAppStore.getState().activeTabId).toBe("/personal/README.md");
    expect(useAppStore.getState().tabs[1].content).toBe("unsaved work");
    expect(useAppStore.getState().selectedTabIds).toEqual([]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("searches every open tab, including entries beyond fifty and Chinese paths", () => {
    useAppStore.setState({
      tabs: [
        ...Array.from({ length: 80 }, (_, i) => tab(`/notes/note-${i}.md`)),
        tab("/笔记/中文 空格.md"),
      ],
    });
    render(<OpenTabsDialog onClose={vi.fn()} />);
    expect(screen.getAllByRole("option")).toHaveLength(81);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "中文 空格" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("/笔记/中文 空格.md");
  });

  it("does not switch during IME composition or when there are no matches", () => {
    const onClose = vi.fn();
    render(<OpenTabsDialog onClose={onClose} />);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    fireEvent.change(input, { target: { value: "no-such-document" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("No matching open tabs.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(useAppStore.getState().activeTabId).toBe("/work/README.md");
  });

  it("navigates with arrows and clamps the selection after another tab closes", () => {
    render(<OpenTabsDialog onClose={vi.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { selected: true })).toHaveTextContent(
      "/personal/README.md",
    );
    act(() => useAppStore.getState().closeTab("/personal/README.md"));
    expect(screen.getByRole("option", { selected: true })).toHaveTextContent(
      "/work/README.md",
    );
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(useAppStore.getState().activeTabId).toBe("/笔记/中文 空格.md");
  });

  it("keeps the actual current tab, even when search highlights a different file", () => {
    const onClose = vi.fn();
    render(<OpenTabsDialog onClose={onClose} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "中文" } });
    fireEvent.click(screen.getByRole("button", { name: "Keep only current" }));
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/work/README.md"]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes all tabs rather than only search results", () => {
    const onClose = vi.fn();
    render(<OpenTabsDialog onClose={onClose} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "中文" } });
    fireEvent.click(screen.getByRole("button", { name: "Close all (3)" }));
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["scratch:welcome"]);
    expect(useAppStore.getState().recentlyClosed).toHaveLength(3);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("preserves pinned tabs by default and can explicitly keep only one", () => {
    useAppStore.setState({
      tabs: [tab("/pin.md", { pinned: true }), tab("/work/README.md"), tab("/other.md")],
    });
    render(<OpenTabsDialog onClose={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Close unpinned (2)" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep current & pinned" }));
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual([
      "/pin.md",
      "/work/README.md",
    ]);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Keep only current" }));
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/work/README.md"]);
  });

  it("asks once for dirty files and scratch content; cancellation preserves the search", () => {
    useAppStore.setState({
      tabs: [
        tab("/work/README.md", { status: "error" }),
        tab("scratch:new-1", { path: null, name: "Untitled", content: "new draft" }),
      ],
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const onClose = vi.fn();
    render(<OpenTabsDialog onClose={onClose} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "work" } });
    fireEvent.click(screen.getByRole("button", { name: "Close all (2)" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0][0]).toContain("README.md");
    expect(confirm.mock.calls[0][0]).toContain("Untitled");
    expect(useAppStore.getState().tabs).toHaveLength(2);
    expect(screen.getByRole("combobox")).toHaveValue("work");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("uses the live active tab when a file opens while the dialog is visible", () => {
    render(<OpenTabsDialog onClose={vi.fn()} />);
    act(() =>
      useAppStore
        .getState()
        .openLoadedFile({ path: "/new.md", content: "# New", mtime_ms: 1 }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Keep only current" }));
    expect(useAppStore.getState().tabs.map((t) => t.id)).toEqual(["/new.md"]);
  });

  it("waits for native confirmation and keeps the query on Cancel even if Finder opens a file", async () => {
    useAppStore.getState().patchTab("/work/README.md", { status: "dirty" });
    let answer!: (value: boolean) => void;
    const confirm = vi.spyOn(confirmation, "confirmDiscardMessage").mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          answer = resolve;
        }),
    );
    const onClose = vi.fn();
    render(<OpenTabsDialog onClose={onClose} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "work" } });
    fireEvent.click(screen.getByRole("button", { name: "Close all (3)" }));
    expect(onClose).not.toHaveBeenCalled();
    act(() =>
      useAppStore
        .getState()
        .openLoadedFile({ path: "/finder.md", content: "new", mtime_ms: 1 }),
    );
    await act(async () => {
      answer(false);
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toHaveValue("work");
    expect(useAppStore.getState().tabs).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Close all (4)" }));
    await act(async () => {
      answer(true);
    });
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalledOnce();
    expect(useAppStore.getState().tabs[0].id).toBe("scratch:welcome");
  });

  it("dismisses after confirmed closure replaces Welcome with a new Welcome", async () => {
    useAppStore.setState({ tabs: [], activeTabId: null });
    useAppStore.getState().newScratchTab();
    useAppStore.getState().closeAllTabs();
    useAppStore.getState().openScratchWithContent("Untitled", "native test draft");
    vi.spyOn(confirmation, "confirmDiscardMessage").mockResolvedValue(true);
    const onClose = vi.fn();
    render(<OpenTabsDialog onClose={onClose} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close all (2)" }));
    });
    expect(useAppStore.getState().tabs.map((tab) => tab.id)).toEqual(["scratch:welcome"]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("traps focus, dismisses with Escape and restores the opener", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const onClose = vi.fn();
    const { unmount } = render(<OpenTabsDialog onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    const close = within(dialog).getByRole("button", { name: "Close tab manager" });
    const last = within(dialog).getByRole("button", { name: "Close all (3)" });
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
