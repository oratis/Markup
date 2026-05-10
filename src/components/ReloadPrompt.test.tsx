import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as tauri from "../lib/tauri";
import { useAppStore } from "../store";
import { ReloadPrompt } from "./ReloadPrompt";

beforeEach(() => {
  useAppStore.setState({
    tabs: [
      {
        id: "/n.md",
        path: "/n.md",
        name: "n.md",
        content: "old",
        mtimeMs: 100,
        status: "saved",
        errorMessage: null,
      },
    ],
    activeTabId: "/n.md",
  });
});

describe("ReloadPrompt", () => {
  it("renders the warning message + Reload + Dismiss buttons", () => {
    render(<ReloadPrompt />);
    expect(screen.getByText(/file changed on disk/i)).toBeInTheDocument();
    expect(screen.getByText(/^reload$/i)).toBeInTheDocument();
    expect(screen.getByText(/^dismiss$/i)).toBeInTheDocument();
  });

  it("returns null when the active tab has no path", () => {
    useAppStore.setState({
      tabs: [
        {
          id: "scratch:1",
          path: null,
          name: "Untitled",
          content: "",
          mtimeMs: null,
          status: "saved",
          errorMessage: null,
        },
      ],
      activeTabId: "scratch:1",
    });
    const { container } = render(<ReloadPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it("clicking Reload reads the file and replaces the tab content", async () => {
    vi.spyOn(tauri, "readFile").mockResolvedValue({
      path: "/n.md",
      content: "fresh content from disk",
      mtime_ms: 200,
    });
    const onReload = vi.fn();
    render(<ReloadPrompt onReload={onReload} />);
    fireEvent.click(screen.getByText(/^reload$/i));
    // Microtask flush
    await Promise.resolve();
    await Promise.resolve();
    expect(tauri.readFile).toHaveBeenCalledWith("/n.md");
    expect(onReload).toHaveBeenCalled();
  });

  it("clicking Dismiss calls onDismiss but doesn't read the file", () => {
    const onDismiss = vi.fn();
    const readSpy = vi.spyOn(tauri, "readFile");
    render(<ReloadPrompt onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText(/^dismiss$/i));
    expect(onDismiss).toHaveBeenCalled();
    expect(readSpy).not.toHaveBeenCalled();
  });
});
