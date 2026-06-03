/**
 * Obsidian-compatible `.canvas` JSON parser/serializer.
 *
 * Format reference: Obsidian 1.4+ JSON Canvas spec.
 * https://jsoncanvas.org/spec/1.0/
 *
 * Schema (essentials):
 *   {
 *     "nodes": [
 *       { "id", "type": "text" | "file" | "link" | "group",
 *         "x", "y", "width", "height",
 *         + type-specific fields, + optional "color" },
 *       ...
 *     ],
 *     "edges": [
 *       { "id", "fromNode", "fromSide"?, "fromEnd"?,
 *         "toNode",   "toSide"?,   "toEnd"?,
 *         "label"?, "color"? },
 *       ...
 *     ]
 *   }
 *
 * Forwards-compat rule: this parser preserves any field it does not
 * understand on both nodes and edges (and at the document root). The
 * serializer writes them back, so a round-trip never silently drops
 * data Obsidian (or a future spec revision) wrote.
 */
export type CanvasSide = "top" | "right" | "bottom" | "left";
export type CanvasEndStyle = "none" | "arrow";
export type CanvasNodeType = "text" | "file" | "link" | "group";

export interface CanvasNode {
  id: string;
  type: CanvasNodeType | (string & {});
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  file?: string;
  subpath?: string;
  url?: string;
  label?: string;
  background?: string;
  backgroundStyle?: string;
  [extra: string]: unknown;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: CanvasSide;
  toSide?: CanvasSide;
  fromEnd?: CanvasEndStyle;
  toEnd?: CanvasEndStyle;
  label?: string;
  color?: string;
  [extra: string]: unknown;
}

export interface CanvasDoc {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  [extra: string]: unknown;
}

const KNOWN_NODE_KEYS = new Set([
  "id",
  "type",
  "x",
  "y",
  "width",
  "height",
  "color",
  "text",
  "file",
  "subpath",
  "url",
  "label",
  "background",
  "backgroundStyle",
]);

const KNOWN_EDGE_KEYS = new Set([
  "id",
  "fromNode",
  "toNode",
  "fromSide",
  "toSide",
  "fromEnd",
  "toEnd",
  "label",
  "color",
]);

const VALID_SIDES: ReadonlySet<string> = new Set(["top", "right", "bottom", "left"]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Build an empty canvas document. */
export function emptyCanvas(): CanvasDoc {
  return { nodes: [], edges: [] };
}

/** Validation result discriminated union. */
export type CanvasValidation =
  | { ok: true; doc: CanvasDoc }
  | { ok: false; errors: string[] };

/** Validate an arbitrary parsed JSON value as a CanvasDoc, returning a
 *  normalised doc or a list of human-readable errors. Tolerant: ignores
 *  malformed individual nodes/edges if the top-level shape is valid,
 *  but flags them in `errors` (caller decides whether to treat as fatal).
 *
 *  An empty `nodes` / `edges` array is fine. A missing array is
 *  silently filled in (treated as empty), matching Obsidian's behaviour
 *  for freshly-created canvases. */
export function validateCanvas(input: unknown): CanvasValidation {
  const errors: string[] = [];
  if (!isPlainObject(input)) {
    return { ok: false, errors: ["root: expected JSON object"] };
  }

  const rawNodes = input.nodes;
  const rawEdges = input.edges;
  if (rawNodes !== undefined && !Array.isArray(rawNodes)) {
    return { ok: false, errors: ["nodes: expected array"] };
  }
  if (rawEdges !== undefined && !Array.isArray(rawEdges)) {
    return { ok: false, errors: ["edges: expected array"] };
  }

  const nodes: CanvasNode[] = [];
  const seenNodeIds = new Set<string>();
  if (Array.isArray(rawNodes)) {
    for (let i = 0; i < rawNodes.length; i++) {
      const raw = rawNodes[i];
      const node = coerceNode(raw, i, errors);
      if (!node) continue;
      if (seenNodeIds.has(node.id)) {
        errors.push(`nodes[${i}]: duplicate id "${node.id}"`);
        continue;
      }
      seenNodeIds.add(node.id);
      nodes.push(node);
    }
  }

  const edges: CanvasEdge[] = [];
  const seenEdgeIds = new Set<string>();
  if (Array.isArray(rawEdges)) {
    for (let i = 0; i < rawEdges.length; i++) {
      const raw = rawEdges[i];
      const edge = coerceEdge(raw, i, errors);
      if (!edge) continue;
      if (seenEdgeIds.has(edge.id)) {
        errors.push(`edges[${i}]: duplicate id "${edge.id}"`);
        continue;
      }
      seenEdgeIds.add(edge.id);
      edges.push(edge);
    }
  }

  // Preserve unknown top-level fields verbatim.
  const doc: CanvasDoc = { nodes, edges };
  for (const [k, v] of Object.entries(input)) {
    if (k === "nodes" || k === "edges") continue;
    doc[k] = v;
  }
  return { ok: true, doc };
}

function coerceNode(raw: unknown, index: number, errors: string[]): CanvasNode | null {
  if (!isPlainObject(raw)) {
    errors.push(`nodes[${index}]: expected object`);
    return null;
  }
  const id = raw.id;
  if (typeof id !== "string" || id.length === 0) {
    errors.push(`nodes[${index}]: missing id`);
    return null;
  }
  const type = raw.type;
  if (typeof type !== "string" || type.length === 0) {
    errors.push(`nodes[${index}] (${id}): missing type`);
    return null;
  }
  const x = isFiniteNumber(raw.x) ? raw.x : 0;
  const y = isFiniteNumber(raw.y) ? raw.y : 0;
  const width = isFiniteNumber(raw.width) ? raw.width : 0;
  const height = isFiniteNumber(raw.height) ? raw.height : 0;

  const node: CanvasNode = {
    id,
    type,
    x,
    y,
    width,
    height,
  };
  if (typeof raw.color === "string") node.color = raw.color;
  if (typeof raw.text === "string") node.text = raw.text;
  if (typeof raw.file === "string") node.file = raw.file;
  if (typeof raw.subpath === "string") node.subpath = raw.subpath;
  if (typeof raw.url === "string") node.url = raw.url;
  if (typeof raw.label === "string") node.label = raw.label;
  if (typeof raw.background === "string") node.background = raw.background;
  if (typeof raw.backgroundStyle === "string") {
    node.backgroundStyle = raw.backgroundStyle;
  }

  // Preserve unknown fields verbatim. Known fields with an invalid value
  // (e.g. a non-string color, an unrecognised side/end enum) are
  // deliberately dropped above — that's value sanitisation, distinct from
  // the forwards-compat preservation of genuinely-new keys here. See the
  // "drops an invalid fromSide silently" test.
  for (const [k, v] of Object.entries(raw)) {
    if (!KNOWN_NODE_KEYS.has(k)) node[k] = v;
  }
  return node;
}

function coerceEdge(raw: unknown, index: number, errors: string[]): CanvasEdge | null {
  if (!isPlainObject(raw)) {
    errors.push(`edges[${index}]: expected object`);
    return null;
  }
  const id = raw.id;
  if (typeof id !== "string" || id.length === 0) {
    errors.push(`edges[${index}]: missing id`);
    return null;
  }
  const fromNode = raw.fromNode;
  const toNode = raw.toNode;
  if (typeof fromNode !== "string" || fromNode.length === 0) {
    errors.push(`edges[${index}] (${id}): missing fromNode`);
    return null;
  }
  if (typeof toNode !== "string" || toNode.length === 0) {
    errors.push(`edges[${index}] (${id}): missing toNode`);
    return null;
  }

  const edge: CanvasEdge = { id, fromNode, toNode };
  if (typeof raw.fromSide === "string" && VALID_SIDES.has(raw.fromSide)) {
    edge.fromSide = raw.fromSide as CanvasSide;
  }
  if (typeof raw.toSide === "string" && VALID_SIDES.has(raw.toSide)) {
    edge.toSide = raw.toSide as CanvasSide;
  }
  if (raw.fromEnd === "none" || raw.fromEnd === "arrow") {
    edge.fromEnd = raw.fromEnd;
  }
  if (raw.toEnd === "none" || raw.toEnd === "arrow") {
    edge.toEnd = raw.toEnd;
  }
  if (typeof raw.label === "string") edge.label = raw.label;
  if (typeof raw.color === "string") edge.color = raw.color;

  // Preserve unknown fields verbatim; invalid values of known fields are
  // deliberately dropped above (see coerceNode).
  for (const [k, v] of Object.entries(raw)) {
    if (!KNOWN_EDGE_KEYS.has(k)) edge[k] = v;
  }
  return edge;
}

/** Parse a `.canvas` JSON string into a CanvasDoc. Throws on malformed
 *  JSON. Treats an empty / whitespace-only string as an empty canvas
 *  (matches Obsidian: brand-new canvases are written as `{}`). When
 *  the JSON parses but the shape is wrong, returns the best-effort
 *  partial doc — call `validateCanvas` directly if you need the
 *  error list. */
export function parseCanvas(raw: string): CanvasDoc {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "{}") return emptyCanvas();
  const value: unknown = JSON.parse(raw);
  const result = validateCanvas(value);
  if (!result.ok) {
    // Root-level shape was so broken we couldn't extract anything —
    // fall back to empty instead of throwing, so a malformed file
    // doesn't bring down the editor.
    return emptyCanvas();
  }
  return result.doc;
}

/** Serialise a CanvasDoc to a JSON string. Pretty-printed with 2-space
 *  indent by default (matches Obsidian's on-disk format) so diffs stay
 *  reviewable. Unknown fields are emitted last on each object. */
export function serializeCanvas(doc: CanvasDoc, pretty = true): string {
  const out: Record<string, unknown> = {
    nodes: doc.nodes.map(serializeNode),
    edges: doc.edges.map(serializeEdge),
  };
  for (const [k, v] of Object.entries(doc)) {
    if (k === "nodes" || k === "edges") continue;
    out[k] = v;
  }
  return JSON.stringify(out, null, pretty ? "\t" : 0);
}

function serializeNode(node: CanvasNode): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: node.id,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };
  if (node.color !== undefined) out.color = node.color;
  if (node.text !== undefined) out.text = node.text;
  if (node.file !== undefined) out.file = node.file;
  if (node.subpath !== undefined) out.subpath = node.subpath;
  if (node.url !== undefined) out.url = node.url;
  if (node.label !== undefined) out.label = node.label;
  if (node.background !== undefined) out.background = node.background;
  if (node.backgroundStyle !== undefined) {
    out.backgroundStyle = node.backgroundStyle;
  }
  for (const [k, v] of Object.entries(node)) {
    if (!KNOWN_NODE_KEYS.has(k)) out[k] = v;
  }
  return out;
}

function serializeEdge(edge: CanvasEdge): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: edge.id,
    fromNode: edge.fromNode,
    toNode: edge.toNode,
  };
  if (edge.fromSide !== undefined) out.fromSide = edge.fromSide;
  if (edge.toSide !== undefined) out.toSide = edge.toSide;
  if (edge.fromEnd !== undefined) out.fromEnd = edge.fromEnd;
  if (edge.toEnd !== undefined) out.toEnd = edge.toEnd;
  if (edge.label !== undefined) out.label = edge.label;
  if (edge.color !== undefined) out.color = edge.color;
  for (const [k, v] of Object.entries(edge)) {
    if (!KNOWN_EDGE_KEYS.has(k)) out[k] = v;
  }
  return out;
}
