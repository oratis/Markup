import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CanvasDoc, CanvasEdge, CanvasNode } from "../lib/canvas-format";
import { CanvasEdgesLayer } from "./CanvasEdgesLayer";

const node = (id: string, x: number, y: number, w = 100, h = 60): CanvasNode => ({
  id,
  type: "text",
  x,
  y,
  width: w,
  height: h,
});

const edge = (
  over: Partial<CanvasEdge> & { id: string; fromNode: string; toNode: string },
): CanvasEdge => ({
  ...over,
});

function doc(nodes: CanvasNode[], edges: CanvasEdge[]): CanvasDoc {
  return { nodes, edges };
}

describe("CanvasEdgesLayer", () => {
  it("renders one <g> per edge", () => {
    const d = doc(
      [node("a", 0, 0), node("b", 400, 0)],
      [edge({ id: "e1", fromNode: "a", toNode: "b" })],
    );
    render(<CanvasEdgesLayer doc={d} selection={new Set()} />);
    expect(screen.getByTestId("canvas-edge-e1")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-edge-e1-path")).toBeInTheDocument();
  });

  it("skips edges whose endpoints are missing", () => {
    const d = doc(
      [node("a", 0, 0)],
      [edge({ id: "e-dangle", fromNode: "a", toNode: "missing" })],
    );
    render(<CanvasEdgesLayer doc={d} selection={new Set()} />);
    expect(screen.queryByTestId("canvas-edge-e-dangle")).toBeNull();
  });

  it("renders the label when present", () => {
    const d = doc(
      [node("a", 0, 0), node("b", 400, 0)],
      [edge({ id: "e", fromNode: "a", toNode: "b", label: "edges to" })],
    );
    render(<CanvasEdgesLayer doc={d} selection={new Set()} />);
    expect(screen.getByTestId("canvas-edge-e-label")).toHaveTextContent("edges to");
  });

  it("uses a thicker stroke for selected edges", () => {
    const d = doc(
      [node("a", 0, 0), node("b", 400, 0)],
      [edge({ id: "e", fromNode: "a", toNode: "b" })],
    );
    render(<CanvasEdgesLayer doc={d} selection={new Set(["e"])} />);
    const path = screen.getByTestId("canvas-edge-e-path");
    expect(path.getAttribute("stroke-width")).toBe("3");
  });

  it("maps Obsidian colour 1 to red", () => {
    const d = doc(
      [node("a", 0, 0), node("b", 400, 0)],
      [edge({ id: "e", fromNode: "a", toNode: "b", color: "1" })],
    );
    render(<CanvasEdgesLayer doc={d} selection={new Set()} />);
    expect(screen.getByTestId("canvas-edge-e-path").getAttribute("stroke")).toMatch(
      /^#ef|red/i,
    );
  });

  it("passes raw hex colour through unchanged", () => {
    const d = doc(
      [node("a", 0, 0), node("b", 400, 0)],
      [edge({ id: "e", fromNode: "a", toNode: "b", color: "#abc123" })],
    );
    render(<CanvasEdgesLayer doc={d} selection={new Set()} />);
    expect(screen.getByTestId("canvas-edge-e-path").getAttribute("stroke")).toBe(
      "#abc123",
    );
  });
});
