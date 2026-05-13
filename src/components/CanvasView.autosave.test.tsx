import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/tauri", () => ({
  writeFile: vi.fn(),
}));

import { _resetCanvasRegistry, getOrCreateCanvasStore } from "../lib/canvas-registry";
import { writeFile } from "../lib/tauri";
import { useAppStore } from "../store";
import { CanvasView } from "./CanvasView";

const TAB_ID = "/v/board.canvas";

function seedCanvasTab() {
  useAppStore.setState({
    tabs: [
      {
        id: TAB_ID,
        path: TAB_ID,
        name: "board.canvas",
        content: "{}",
        mtimeMs: 0,
        status: "saved",
        errorMessage: null,
        kind: "canvas",
      },
    ],
    activeTabId: TAB_ID,
    autosaveMs: 100,
  });
}

describe("CanvasView autosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(writeFile).mockReset();
    _resetCanvasRegistry();
    useAppStore.setState({ tabs: [], activeTabId: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes to disk after autosave delay when the doc mutates", async () => {
    vi.mocked(writeFile).mockResolvedValue(999);
    seedCanvasTab();
    render(<CanvasView />);
    const store = getOrCreateCanvasStore(TAB_ID, "{}");
    act(() => {
      store.addNode({
        id: "n",
        type: "text",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        text: "x",
      });
    });
    expect(writeFile).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(120);
    });
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(vi.mocked(writeFile).mock.calls[0][0]).toBe(TAB_ID);
  });

  it("debounces — only one write across burst mutations", async () => {
    vi.mocked(writeFile).mockResolvedValue(999);
    seedCanvasTab();
    render(<CanvasView />);
    const store = getOrCreateCanvasStore(TAB_ID, "{}");
    act(() => {
      store.addNode({
        id: "a",
        type: "text",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      });
    });
    await act(async () => {
      vi.advanceTimersByTime(40);
    });
    act(() => {
      store.addNode({
        id: "b",
        type: "text",
        x: 10,
        y: 0,
        width: 1,
        height: 1,
      });
    });
    await act(async () => {
      vi.advanceTimersByTime(40);
    });
    act(() => {
      store.addNode({
        id: "c",
        type: "text",
        x: 20,
        y: 0,
        width: 1,
        height: 1,
      });
    });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it("does NOT autosave on the first render (read-from-disk seed)", async () => {
    vi.mocked(writeFile).mockResolvedValue(0);
    seedCanvasTab();
    render(<CanvasView />);
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("with autosaveMs=0, updates tab.content but doesn't write to disk", async () => {
    vi.mocked(writeFile).mockResolvedValue(0);
    seedCanvasTab();
    useAppStore.setState({ autosaveMs: 0 });
    render(<CanvasView />);
    const store = getOrCreateCanvasStore(TAB_ID, "{}");
    act(() => {
      store.addNode({
        id: "n",
        type: "text",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      });
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(writeFile).not.toHaveBeenCalled();
    // But the tab buffer should reflect the change so manual ⌘S works.
    expect(useAppStore.getState().tabs[0].content).toContain('"id": "n"');
  });
});
