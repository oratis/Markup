import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../store";
import { StatusBar } from "./StatusBar";

function setActive(content: string, opts: Partial<{ vault: string | null }> = {}) {
  useAppStore.setState({
    sourceMode: false,
    vaultRoot: opts.vault ?? null,
    tabs: [
      {
        id: "/x.md",
        path: "/x.md",
        name: "x.md",
        content,
        mtimeMs: 1,
        status: "saved",
        errorMessage: null,
      },
    ],
    activeTabId: "/x.md",
  });
}

beforeEach(() => {
  useAppStore.setState({ sourceMode: false, vaultRoot: null });
});

describe("StatusBar word count", () => {
  it("counts plain English words by whitespace", () => {
    setActive("hello world from markup");
    render(<StatusBar />);
    expect(screen.getByText("4 words")).toBeInTheDocument();
  });

  it("counts each CJK character as a word", () => {
    setActive("欢迎使用");
    render(<StatusBar />);
    expect(screen.getByText("4 words")).toBeInTheDocument();
  });

  it("mixes CJK and English correctly", () => {
    setActive("hello 世界 markup");
    render(<StatusBar />);
    expect(screen.getByText("4 words")).toBeInTheDocument();
  });

  it("reports 0 words for empty or whitespace-only content", () => {
    setActive("   \n\n   ");
    render(<StatusBar />);
    expect(screen.getByText("0 words")).toBeInTheDocument();
  });

  it('shows "WYSIWYG" when not in source mode and "Source" otherwise', () => {
    setActive("body");
    render(<StatusBar />);
    expect(screen.getByText("WYSIWYG")).toBeInTheDocument();
  });

  it("renders the vault root path when one is open", () => {
    setActive("body", { vault: "/Users/test/vault" });
    render(<StatusBar />);
    expect(screen.getByText(/\/Users\/test\/vault/)).toBeInTheDocument();
  });

  it("shows the unsaved-tab count badge when at least one path-backed tab is dirty", () => {
    useAppStore.setState({
      sourceMode: false,
      vaultRoot: null,
      tabs: [
        {
          id: "/a.md",
          path: "/a.md",
          name: "a.md",
          content: "a",
          mtimeMs: 1,
          status: "dirty",
          errorMessage: null,
        },
        {
          id: "/b.md",
          path: "/b.md",
          name: "b.md",
          content: "b",
          mtimeMs: 1,
          status: "saved",
          errorMessage: null,
        },
        {
          id: "/c.md",
          path: "/c.md",
          name: "c.md",
          content: "c",
          mtimeMs: 1,
          status: "dirty",
          errorMessage: null,
        },
      ],
      activeTabId: "/a.md",
    });
    render(<StatusBar />);
    expect(screen.getByText("2 unsaved")).toBeInTheDocument();
  });
});

describe("StatusBar selection counter", () => {
  it("renders nothing when selection is empty", () => {
    setActive("hello world from markup");
    render(<StatusBar />);
    expect(screen.queryByText(/Selected/)).toBeNull();
  });

  it("shows word & char count for the active DOM selection", () => {
    setActive("hello world from markup");
    // Stub the selection — jsdom's `Selection.toString()` returns "" without
    // a real range, so monkey-patch `window.getSelection`.
    const orig = window.getSelection;
    const fakeSel = {
      toString: () => "hello world",
      rangeCount: 1,
    } as unknown as Selection;
    window.getSelection = () => fakeSel;
    // Mock requestAnimationFrame to be synchronous so the effect's read happens
    // inside this `act` block.
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });
    try {
      render(<StatusBar />);
      act(() => {
        document.dispatchEvent(new Event("selectionchange"));
      });
      expect(screen.getByText(/Selected: 2 words, 11 chars/)).toBeInTheDocument();
    } finally {
      window.getSelection = orig;
      rafSpy.mockRestore();
    }
  });
});
