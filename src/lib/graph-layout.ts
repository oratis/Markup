/**
 * Simple force-directed graph layout. Pure function: deterministic per
 * `seed` so tests reproduce; settles in `iterations` steps without any
 * animation loop. Caller renders the final coordinates.
 *
 * No external dependency — D3 would be ~70 KB and we only need this
 * for the (rare) GraphView modal. Algorithm:
 *  - Coulomb repulsion between every node pair
 *  - Hooke attraction along each edge toward an ideal length
 *  - Soft pull toward the canvas centre (keeps disconnected clusters
 *    on screen)
 *  - Per-iteration velocity damping; positions clamp to canvas
 *
 * For ~200 nodes / ~400 edges this runs in <100 ms on a M1 — well
 * under the threshold where a Web Worker would be worth the wiring.
 */

export interface GraphNode {
  id: string;
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
}

export interface LayoutNode {
  id: string;
  label: string;
  x: number;
  y: number;
  degree: number;
}

export interface LayoutOptions {
  width: number;
  height: number;
  iterations?: number;
  /** Repulsion strength between nodes. */
  repulsion?: number;
  /** Edge spring stiffness. */
  attraction?: number;
  /** Ideal edge length in pixels. */
  edgeLength?: number;
  /** Centre gravity strength. */
  gravity?: number;
  /** Seed for the initial random layout. */
  seed?: number;
}

/** Tiny deterministic PRNG so tests reproduce layouts. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  opts: LayoutOptions,
): LayoutNode[] {
  const {
    width,
    height,
    iterations = 120,
    repulsion = 5000,
    attraction = 0.04,
    edgeLength = 80,
    gravity = 0.02,
    seed = 1,
  } = opts;
  if (nodes.length === 0) return [];

  const rand = mulberry32(seed);
  const positions = nodes.map((n) => ({
    id: n.id,
    label: n.label,
    x: width / 2 + (rand() - 0.5) * width * 0.6,
    y: height / 2 + (rand() - 0.5) * height * 0.6,
    vx: 0,
    vy: 0,
    degree: 0,
  }));
  const indexById = new Map(positions.map((p, i) => [p.id, i]));

  // Pre-compute edge index pairs and degree counts.
  const edgePairs: { a: number; b: number; w: number }[] = [];
  for (const e of edges) {
    const a = indexById.get(e.source);
    const b = indexById.get(e.target);
    if (a === undefined || b === undefined || a === b) continue;
    edgePairs.push({ a, b, w: e.weight ?? 1 });
    positions[a].degree++;
    positions[b].degree++;
  }

  const cx = width / 2;
  const cy = height / 2;

  for (let iter = 0; iter < iterations; iter++) {
    // Cooling factor — earlier iterations apply forces fully, later
    // iterations let the system settle.
    const damping = 0.85 - 0.5 * (iter / iterations);

    // Repulsion: every pair of nodes.
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const distSq = Math.max(dx * dx + dy * dy, 0.01);
        const dist = Math.sqrt(distSq);
        const force = repulsion / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        positions[i].vx += fx;
        positions[i].vy += fy;
        positions[j].vx -= fx;
        positions[j].vy -= fy;
      }
    }

    // Attraction along edges (Hooke).
    for (const { a, b, w } of edgePairs) {
      const dx = positions[b].x - positions[a].x;
      const dy = positions[b].y - positions[a].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const delta = dist - edgeLength;
      const force = attraction * delta * w;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      positions[a].vx += fx;
      positions[a].vy += fy;
      positions[b].vx -= fx;
      positions[b].vy -= fy;
    }

    // Gravity toward centre.
    for (const p of positions) {
      p.vx += (cx - p.x) * gravity;
      p.vy += (cy - p.y) * gravity;
    }

    // Integrate + damp + clamp.
    for (const p of positions) {
      p.x += p.vx * damping;
      p.y += p.vy * damping;
      p.vx *= 0.5;
      p.vy *= 0.5;
      p.x = Math.max(20, Math.min(width - 20, p.x));
      p.y = Math.max(20, Math.min(height - 20, p.y));
    }
  }

  return positions.map(({ id, label, x, y, degree }) => ({
    id,
    label,
    x,
    y,
    degree,
  }));
}

/**
 * Build a `{nodes, edges}` graph from a LinkIndex shape. Each unique
 * source/target pair is rolled into a single edge — duplicates from
 * multiple references between the same files become an edge with
 * weight=count.
 */
export function buildGraphFromLinkIndex(
  index: Record<string, { sourcePath: string }[]>,
  allPaths: string[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const referenced = new Set<string>();
  const edgeMap = new Map<string, GraphEdge>();
  for (const [targetPath, refs] of Object.entries(index)) {
    referenced.add(targetPath);
    for (const r of refs) {
      referenced.add(r.sourcePath);
      const key = `${r.sourcePath}|${targetPath}`;
      const existing = edgeMap.get(key);
      if (existing) existing.weight = (existing.weight ?? 1) + 1;
      else edgeMap.set(key, { source: r.sourcePath, target: targetPath, weight: 1 });
    }
  }
  // Optionally include orphan files (no incoming or outgoing links) so
  // the user can spot them. Currently included — they cluster at the
  // edge of the canvas under gravity.
  const includeOrphans = true;
  const nodeIds = new Set<string>(referenced);
  if (includeOrphans) for (const p of allPaths) nodeIds.add(p);

  const basename = (p: string) => {
    const slash = p.lastIndexOf("/");
    const name = slash >= 0 ? p.slice(slash + 1) : p;
    return name.replace(/\.md$/i, "");
  };

  const nodes: GraphNode[] = [...nodeIds].map((id) => ({ id, label: basename(id) }));
  return { nodes, edges: [...edgeMap.values()] };
}
