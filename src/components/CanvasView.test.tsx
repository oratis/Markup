import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { _resetCanvasRegistry } from "../lib/canvas-registry";
import { useAppStore } from "../store";
import { CanvasView } from "./CanvasView";

const CANVAS_TAB_ID = "/v/board.canvas";

const seedCanvasJson = JSON.stringify({
  nodes: [
    { id: "n1", type: "text", x: 0, y: 0, width: 200, height: 100, text: "hi" },
    { id: "n2", type: "text", x: 300, y: 0, width: 200, height: 100, text: "bye" },
  ],
  edges: [{ id: "e1", fromNode: "n1", toNode: "n2" }],
});

function seedCanvasTab(content = seedCanvasJson) {
  useAppStore.setState({
    tabs: [
      {
        id: CANVAS_TAB_ID,
        path: CANVAS_TAB_ID,
        name: "board.canvas",
        content,
        mtimeMs: 0,
        status: "saved",
        errorMessage: null,
        kind: "canvas",
      },
    ],
    activeTabId: CANVAS_TAB_ID,
  });
}

describe("CanvasView", () => {
  beforeEach(() => {
    _resetCanvasRegistry();
    useAppStore.setState({ tabs: [], activeTabId: null });
  });

  it("returns null when there's no active tab", () => {
    const { container } = render(<CanvasView />);
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when active tab is not a canvas", () => {
    useAppStore.setState({
      tabs: [
        {
          id: "/v/foo.md",
          path: "/v/foo.md",
          name: "foo.md",
          content: "# md",
          mtimeMs: 0,
          status: "saved",
          errorMessage: null,
          kind: "markdown",
        },
      ],
      activeTabId: "/v/foo.md",
    });
    const { container } = render(<CanvasView />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the world + HUD for a canvas tab", () => {
    seedCanvasTab();
    render(<CanvasView />);
    expect(screen.getByTestId("canvas-view")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-world")).toBeInTheDocument();
  });

  it("HUD reports the doc's node and edge counts", () => {
    seedCanvasTab();
    render(<CanvasView />);
    expect(screen.getByText(/2 nodes · 1 edges · 100%/)).toBeInTheDocument();
  });

  it("HUD reports 0/0 for an empty canvas", () => {
    seedCanvasTab("{}");
    render(<CanvasView />);
    expect(screen.getByText(/0 nodes · 0 edges · 100%/)).toBeInTheDocument();
  });

  it("starts at 100% zoom with no pan offset", () => {
    seedCanvasTab();
    render(<CanvasView />);
    const world = screen.getByTestId("canvas-world");
    expect(world.style.transform).toContain("scale(1)");
    expect(world.style.transform).toContain("translate(0px, 0px)");
  });

  it("renders the zoom-controls cluster", () => {
    seedCanvasTab();
    render(<CanvasView />);
    expect(screen.getByLabelText(/Zoom in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Zoom out/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reset zoom/i)).toBeInTheDocument();
  });
});
