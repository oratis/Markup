import { describe, expect, it } from "vitest";
import { buildGraphFromLinkIndex, layoutGraph } from "./graph-layout";

describe("layoutGraph", () => {
  it("returns empty for empty input", () => {
    expect(layoutGraph([], [], { width: 600, height: 400 })).toEqual([]);
  });

  it("places every node inside the canvas with clamping", () => {
    const nodes = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      label: String(i),
    }));
    const edges = nodes.slice(1).map((n, i) => ({ source: String(i), target: n.id }));
    const out = layoutGraph(nodes, edges, { width: 600, height: 400 });
    for (const p of out) {
      expect(p.x).toBeGreaterThanOrEqual(20);
      expect(p.x).toBeLessThanOrEqual(580);
      expect(p.y).toBeGreaterThanOrEqual(20);
      expect(p.y).toBeLessThanOrEqual(380);
    }
  });

  it("is deterministic per seed", () => {
    const nodes = [
      { id: "a", label: "a" },
      { id: "b", label: "b" },
      { id: "c", label: "c" },
    ];
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ];
    const a = layoutGraph(nodes, edges, { width: 500, height: 400, seed: 42 });
    const b = layoutGraph(nodes, edges, { width: 500, height: 400, seed: 42 });
    expect(a).toEqual(b);
  });

  it("counts degree for each node", () => {
    const out = layoutGraph(
      [
        { id: "a", label: "a" },
        { id: "b", label: "b" },
        { id: "c", label: "c" },
      ],
      [
        { source: "a", target: "b" },
        { source: "a", target: "c" },
      ],
      { width: 400, height: 300 },
    );
    const byId = Object.fromEntries(out.map((n) => [n.id, n.degree]));
    expect(byId.a).toBe(2);
    expect(byId.b).toBe(1);
    expect(byId.c).toBe(1);
  });

  it("ignores self-edges", () => {
    const out = layoutGraph([{ id: "a", label: "a" }], [{ source: "a", target: "a" }], {
      width: 200,
      height: 200,
    });
    expect(out[0].degree).toBe(0);
  });
});

describe("buildGraphFromLinkIndex", () => {
  it("turns the link-index shape into nodes + edges", () => {
    const index = {
      "/v/B.md": [
        { sourcePath: "/v/A.md", target: "B", line: 0, snippet: "", isEmbed: false },
      ],
      "/v/C.md": [
        { sourcePath: "/v/A.md", target: "C", line: 1, snippet: "", isEmbed: false },
        { sourcePath: "/v/B.md", target: "C", line: 0, snippet: "", isEmbed: false },
      ],
    };
    const { nodes, edges } = buildGraphFromLinkIndex(index, [
      "/v/A.md",
      "/v/B.md",
      "/v/C.md",
    ]);
    expect(nodes.length).toBe(3);
    expect(edges.length).toBe(3);
    expect(nodes.map((n) => n.label).sort()).toEqual(["A", "B", "C"]);
  });

  it("collapses duplicate refs into a single weighted edge", () => {
    const index = {
      "/v/B.md": [
        { sourcePath: "/v/A.md", target: "B", line: 0, snippet: "", isEmbed: false },
        { sourcePath: "/v/A.md", target: "B", line: 2, snippet: "", isEmbed: false },
      ],
    };
    const { edges } = buildGraphFromLinkIndex(index, ["/v/A.md", "/v/B.md"]);
    expect(edges).toHaveLength(1);
    expect(edges[0].weight).toBe(2);
  });

  it("includes orphan files (no links) as standalone nodes", () => {
    const { nodes } = buildGraphFromLinkIndex({}, ["/v/orphan.md"]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].label).toBe("orphan");
  });

  it("does not emit a self-loop edge for a note linking to itself", () => {
    const { nodes, edges } = buildGraphFromLinkIndex(
      { "/v/A.md": [{ sourcePath: "/v/A.md" }] },
      ["/v/A.md"],
    );
    expect(edges).toEqual([]);
    expect(nodes.map((n) => n.id)).toContain("/v/A.md");
  });
});
