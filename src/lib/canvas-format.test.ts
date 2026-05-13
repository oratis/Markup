import { describe, expect, it } from "vitest";
import {
  type CanvasDoc,
  emptyCanvas,
  parseCanvas,
  serializeCanvas,
  validateCanvas,
} from "./canvas-format";

describe("emptyCanvas", () => {
  it("is a doc with no nodes or edges", () => {
    const d = emptyCanvas();
    expect(d.nodes).toEqual([]);
    expect(d.edges).toEqual([]);
  });
});

describe("parseCanvas — empty / fresh files", () => {
  it("treats empty string as empty canvas", () => {
    expect(parseCanvas("")).toEqual(emptyCanvas());
  });

  it("treats whitespace-only as empty canvas", () => {
    expect(parseCanvas("  \n\t ")).toEqual(emptyCanvas());
  });

  it("treats {} as empty canvas (Obsidian fresh-file shape)", () => {
    expect(parseCanvas("{}")).toEqual(emptyCanvas());
  });

  it("throws on malformed JSON", () => {
    expect(() => parseCanvas("not json {{{")).toThrow();
  });

  it("returns empty doc when JSON parses but root is wrong type", () => {
    expect(parseCanvas("[]")).toEqual(emptyCanvas());
    expect(parseCanvas("42")).toEqual(emptyCanvas());
    expect(parseCanvas('"a string"')).toEqual(emptyCanvas());
  });
});

describe("parseCanvas — known node types", () => {
  it("parses a text node with all common fields", () => {
    const raw = JSON.stringify({
      nodes: [
        {
          id: "a",
          type: "text",
          x: 10,
          y: 20,
          width: 240,
          height: 120,
          text: "# Hello",
          color: "1",
        },
      ],
      edges: [],
    });
    const doc = parseCanvas(raw);
    expect(doc.nodes).toHaveLength(1);
    expect(doc.nodes[0]).toMatchObject({
      id: "a",
      type: "text",
      x: 10,
      y: 20,
      width: 240,
      height: 120,
      text: "# Hello",
      color: "1",
    });
  });

  it("parses a file node with optional subpath", () => {
    const raw = JSON.stringify({
      nodes: [
        {
          id: "f1",
          type: "file",
          x: 0,
          y: 0,
          width: 320,
          height: 200,
          file: "Notes/Foo.md",
          subpath: "#Section",
        },
      ],
      edges: [],
    });
    const doc = parseCanvas(raw);
    expect(doc.nodes[0].file).toBe("Notes/Foo.md");
    expect(doc.nodes[0].subpath).toBe("#Section");
  });

  it("parses a link node", () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [
          {
            id: "l1",
            type: "link",
            x: 0,
            y: 0,
            width: 320,
            height: 200,
            url: "https://example.com",
          },
        ],
        edges: [],
      }),
    );
    expect(doc.nodes[0].url).toBe("https://example.com");
  });

  it("parses a group node with label + style fields", () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [
          {
            id: "g1",
            type: "group",
            x: -20,
            y: -20,
            width: 700,
            height: 300,
            label: "Section A",
            background: "img.png",
            backgroundStyle: "cover",
          },
        ],
        edges: [],
      }),
    );
    expect(doc.nodes[0]).toMatchObject({
      label: "Section A",
      background: "img.png",
      backgroundStyle: "cover",
    });
  });
});

describe("parseCanvas — edges", () => {
  it("parses an edge with fromSide / toSide / label", () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [],
        edges: [
          {
            id: "e1",
            fromNode: "a",
            fromSide: "right",
            toNode: "b",
            toSide: "left",
            label: "links to",
            color: "1",
          },
        ],
      }),
    );
    expect(doc.edges[0]).toEqual({
      id: "e1",
      fromNode: "a",
      toNode: "b",
      fromSide: "right",
      toSide: "left",
      label: "links to",
      color: "1",
    });
  });

  it("preserves fromEnd / toEnd arrow styles", () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [],
        edges: [
          {
            id: "e",
            fromNode: "a",
            toNode: "b",
            fromEnd: "none",
            toEnd: "arrow",
          },
        ],
      }),
    );
    expect(doc.edges[0].fromEnd).toBe("none");
    expect(doc.edges[0].toEnd).toBe("arrow");
  });

  it("drops an invalid fromSide silently (kept null/undefined)", () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [],
        edges: [{ id: "e", fromNode: "a", toNode: "b", fromSide: "diagonal" }],
      }),
    );
    expect(doc.edges[0].fromSide).toBeUndefined();
  });
});

describe("parseCanvas — forwards-compat (unknown fields)", () => {
  it("preserves unknown top-level fields", () => {
    const raw = JSON.stringify({
      nodes: [],
      edges: [],
      _meta: { version: 7, vendor: "obsidian" },
    });
    const doc = parseCanvas(raw);
    expect((doc as { _meta?: unknown })._meta).toEqual({
      version: 7,
      vendor: "obsidian",
    });
  });

  it("preserves unknown node fields", () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [
          {
            id: "a",
            type: "text",
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            text: "x",
            customFlag: true,
            rotation: 45,
          },
        ],
        edges: [],
      }),
    );
    expect(doc.nodes[0].customFlag).toBe(true);
    expect(doc.nodes[0].rotation).toBe(45);
  });

  it("preserves unknown edge fields", () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [],
        edges: [
          {
            id: "e",
            fromNode: "a",
            toNode: "b",
            curveStyle: "elbow",
          },
        ],
      }),
    );
    expect(doc.edges[0].curveStyle).toBe("elbow");
  });

  it("preserves unknown node type strings (forwards-compat)", () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [{ id: "n", type: "image", x: 0, y: 0, width: 1, height: 1 }],
        edges: [],
      }),
    );
    expect(doc.nodes[0].type).toBe("image");
  });
});

describe("parseCanvas — tolerant malformed handling", () => {
  it("skips nodes without ids but keeps the rest", () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [
          { type: "text", x: 0, y: 0, width: 1, height: 1 },
          { id: "good", type: "text", x: 0, y: 0, width: 1, height: 1 },
        ],
        edges: [],
      }),
    );
    expect(doc.nodes).toHaveLength(1);
    expect(doc.nodes[0].id).toBe("good");
  });

  it("skips edges missing fromNode / toNode", () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [],
        edges: [
          { id: "bad1", toNode: "b" },
          { id: "bad2", fromNode: "a" },
          { id: "ok", fromNode: "a", toNode: "b" },
        ],
      }),
    );
    expect(doc.edges).toHaveLength(1);
    expect(doc.edges[0].id).toBe("ok");
  });

  it("defaults x/y/width/height to 0 when missing or non-numeric", () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [
          {
            id: "n",
            type: "text",
            x: "oops",
            y: null,
            width: Number.NaN,
            height: undefined,
          },
        ],
        edges: [],
      }),
    );
    expect(doc.nodes[0]).toMatchObject({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("rejects duplicate node ids (keeps first)", () => {
    const v = validateCanvas({
      nodes: [
        { id: "a", type: "text", x: 0, y: 0, width: 1, height: 1, text: "first" },
        { id: "a", type: "text", x: 0, y: 0, width: 1, height: 1, text: "second" },
      ],
      edges: [],
    });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.doc.nodes).toHaveLength(1);
      expect(v.doc.nodes[0].text).toBe("first");
    }
  });

  it("rejects duplicate edge ids (keeps first)", () => {
    const v = validateCanvas({
      nodes: [],
      edges: [
        { id: "e", fromNode: "a", toNode: "b" },
        { id: "e", fromNode: "c", toNode: "d" },
      ],
    });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.doc.edges).toHaveLength(1);
      expect(v.doc.edges[0].fromNode).toBe("a");
    }
  });
});

describe("validateCanvas — error reporting", () => {
  it("flags non-object root", () => {
    const v = validateCanvas([]);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors[0]).toMatch(/root/);
  });

  it("flags nodes that is not an array", () => {
    const v = validateCanvas({ nodes: "x" });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors[0]).toMatch(/nodes/);
  });

  it("flags edges that is not an array", () => {
    const v = validateCanvas({ edges: 7 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors[0]).toMatch(/edges/);
  });

  it("accepts missing nodes / edges arrays (treats as empty)", () => {
    const v = validateCanvas({});
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.doc.nodes).toEqual([]);
      expect(v.doc.edges).toEqual([]);
    }
  });
});

describe("serializeCanvas", () => {
  it("emits pretty-printed JSON by default (tab indent)", () => {
    const doc = emptyCanvas();
    const s = serializeCanvas(doc);
    expect(s).toContain("\n");
    expect(s).toContain('"nodes"');
    expect(s).toContain('"edges"');
  });

  it("emits compact JSON when pretty=false", () => {
    const s = serializeCanvas(emptyCanvas(), false);
    expect(s).not.toContain("\n");
  });

  it("emits only declared optional fields (no undefined keys)", () => {
    const doc: CanvasDoc = {
      nodes: [{ id: "a", type: "text", x: 0, y: 0, width: 1, height: 1, text: "x" }],
      edges: [],
    };
    const s = serializeCanvas(doc, false);
    const parsed = JSON.parse(s);
    expect(parsed.nodes[0]).not.toHaveProperty("color");
    expect(parsed.nodes[0]).not.toHaveProperty("file");
    expect(parsed.nodes[0]).not.toHaveProperty("url");
  });

  it("preserves unknown top-level fields", () => {
    const doc: CanvasDoc = {
      nodes: [],
      edges: [],
      version: "1.4",
      flags: { experimental: true },
    };
    const s = serializeCanvas(doc, false);
    const back = JSON.parse(s);
    expect(back.version).toBe("1.4");
    expect(back.flags).toEqual({ experimental: true });
  });
});

describe("round-trip parseCanvas → serializeCanvas → parseCanvas", () => {
  it("preserves a representative full document", () => {
    const original = {
      nodes: [
        {
          id: "n1",
          type: "text",
          x: 0,
          y: 0,
          width: 240,
          height: 120,
          text: "# Hello\n\nBody",
          color: "1",
        },
        {
          id: "n2",
          type: "file",
          x: 300,
          y: 0,
          width: 320,
          height: 200,
          file: "Notes/Foo.md",
          subpath: "#Section",
        },
        {
          id: "n3",
          type: "group",
          x: -20,
          y: -20,
          width: 700,
          height: 300,
          label: "Section A",
        },
        {
          id: "n4",
          type: "image", // unknown future type
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          src: "img.png",
        },
      ],
      edges: [
        {
          id: "e1",
          fromNode: "n1",
          fromSide: "right",
          toNode: "n2",
          toSide: "left",
          label: "links to",
          color: "1",
          customMeta: { z: 7 },
        },
      ],
      version: "1.4",
    };
    const parsed = parseCanvas(JSON.stringify(original));
    const reserialised = serializeCanvas(parsed);
    const reparsed = parseCanvas(reserialised);
    expect(reparsed).toEqual(parsed);
    expect((reparsed.nodes[3] as { src?: string }).src).toBe("img.png");
    expect((reparsed.edges[0] as { customMeta?: unknown }).customMeta).toEqual({
      z: 7,
    });
    expect((reparsed as { version?: string }).version).toBe("1.4");
  });

  it("is idempotent (serialize(parse(serialize(parse(x)))) === serialize(parse(x)))", () => {
    const raw = JSON.stringify({
      nodes: [{ id: "a", type: "text", x: 0, y: 0, width: 1, height: 1, text: "x" }],
      edges: [{ id: "e", fromNode: "a", toNode: "a" }],
    });
    const once = serializeCanvas(parseCanvas(raw));
    const twice = serializeCanvas(parseCanvas(once));
    expect(twice).toBe(once);
  });
});
