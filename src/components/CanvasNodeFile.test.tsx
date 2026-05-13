import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CanvasNode } from "../lib/canvas-format";
import { createEmptyCanvasStore } from "../lib/canvas-store";
import { useAppStore } from "../store";

vi.mock("../lib/tauri", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "../lib/tauri";
import { CanvasNodeFile } from "./CanvasNodeFile";

function fileNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: "f1",
    type: "file",
    x: 10,
    y: 20,
    width: 320,
    height: 200,
    file: "Notes/Foo.md",
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(readFile).mockReset();
  useAppStore.setState({ vaultRoot: "/v" });
});

describe("CanvasNodeFile", () => {
  it("renders the file label in the title strip", () => {
    vi.mocked(readFile).mockResolvedValueOnce({
      path: "/v/Notes/Foo.md",
      content: "# Foo",
      mtime_ms: 1,
    });
    const store = createEmptyCanvasStore();
    render(<CanvasNodeFile node={fileNode()} zoom={1} store={store} />);
    expect(screen.getByTestId("canvas-node-f1-title")).toHaveTextContent("Notes/Foo.md");
  });

  it("shows Loading… before readFile resolves", () => {
    vi.mocked(readFile).mockReturnValueOnce(new Promise(() => {}));
    const store = createEmptyCanvasStore();
    render(<CanvasNodeFile node={fileNode()} zoom={1} store={store} />);
    expect(screen.getByTestId("canvas-node-f1-body")).toHaveTextContent(/Loading/i);
  });

  it("renders the loaded markdown after readFile resolves", async () => {
    vi.mocked(readFile).mockResolvedValueOnce({
      path: "/v/Notes/Foo.md",
      content: "# Foo\n\nBody **here**",
      mtime_ms: 100,
    });
    const store = createEmptyCanvasStore();
    render(<CanvasNodeFile node={fileNode()} zoom={1} store={store} />);
    const body = screen.getByTestId("canvas-node-f1-body");
    await waitFor(() => {
      expect(body.innerHTML).toContain("<h1");
    });
    expect(body.innerHTML).toContain("<strong>here</strong>");
  });

  it("slices to a heading subpath when present", async () => {
    vi.mocked(readFile).mockResolvedValueOnce({
      path: "/v/Notes/Foo.md",
      content: "# A\n\nfirst\n\n## B\n\nsecond body\n\n# C\n\nthird",
      mtime_ms: 0,
    });
    const store = createEmptyCanvasStore();
    render(<CanvasNodeFile node={fileNode({ subpath: "#B" })} zoom={1} store={store} />);
    await waitFor(() => {
      expect(screen.getByTestId("canvas-node-f1-body").innerHTML).toContain(
        "second body",
      );
    });
    expect(screen.getByTestId("canvas-node-f1-body").innerHTML).not.toContain("third");
  });

  it("shows an error state when readFile rejects", async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error("not found"));
    const store = createEmptyCanvasStore();
    render(<CanvasNodeFile node={fileNode()} zoom={1} store={store} />);
    await waitFor(() => {
      expect(screen.getByTestId("canvas-node-f1-body")).toHaveTextContent(/Cannot load/);
    });
  });

  it("shows the 'No file reference' state when node.file is missing", async () => {
    const store = createEmptyCanvasStore();
    render(
      <CanvasNodeFile node={fileNode({ file: undefined })} zoom={1} store={store} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("canvas-node-f1-body")).toHaveTextContent(
        /No file reference/i,
      );
    });
    expect(readFile).not.toHaveBeenCalled();
  });

  it("opens the file as a tab on double-click after load", async () => {
    vi.mocked(readFile).mockResolvedValueOnce({
      path: "/v/Notes/Foo.md",
      content: "body",
      mtime_ms: 42,
    });
    const open = vi.fn();
    useAppStore.setState({ vaultRoot: "/v", openLoadedFile: open });
    const store = createEmptyCanvasStore();
    render(<CanvasNodeFile node={fileNode()} zoom={1} store={store} />);
    await waitFor(() => {
      expect(screen.getByTestId("canvas-node-f1-body").innerHTML).toContain("body");
    });
    const root = screen.getByTestId("canvas-node-f1");
    root.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(open).toHaveBeenCalledWith({
      path: "/v/Notes/Foo.md",
      content: "body",
      mtime_ms: 42,
    });
  });
});
