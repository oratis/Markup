import { useEffect, useMemo, useState } from "react";
import {
  type LayoutNode,
  buildGraphFromLinkIndex,
  layoutGraph,
} from "../lib/graph-layout";
import { useT } from "../lib/i18n";
import {
  __dangerousReadIndexSnapshot as readIndexSnapshot,
  subscribe as subscribeIndex,
} from "../lib/link-index-store";
import { readFile } from "../lib/tauri";
import { getActiveTab, useAppStore } from "../store";

interface Props {
  onClose: () => void;
}

const NODE_LIMIT = 300;
/** How many top-degree nodes get a text label rendered. For dense
 * vaults rendering all 300 labels turns the canvas into illegible
 * overlap; the top hubs are what the user actually scans for. */
const LABEL_TOP_N = 24;

export function GraphView({ onClose }: Props) {
  const t = useT();
  const activeTab = useAppStore(getActiveTab);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);
  const [tick, setTick] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Re-render when the index changes (rare during a graph view session,
  // but covers the "save while open" case).
  useEffect(() => subscribeIndex(() => setTick((x) => x + 1)), []);

  // Track viewport so the canvas grows with the window.
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1200,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Modal claims 90% of the viewport — much more useful for any vault
  // bigger than a handful of files.
  const WIDTH = Math.max(700, Math.min(1600, Math.floor(vp.w * 0.9)));
  const HEIGHT = Math.max(500, Math.min(1000, Math.floor(vp.h * 0.82)));

  const { graph, layout, truncated, allPathsCount } = useMemo(() => {
    const snap = readIndexSnapshot();
    const nodes0 = buildGraphFromLinkIndex(snap.index, snap.allPaths);
    const truncated = nodes0.nodes.length > NODE_LIMIT;
    const nodes = truncated ? nodes0.nodes.slice(0, NODE_LIMIT) : nodes0.nodes;
    const idSet = new Set(nodes.map((n) => n.id));
    const edges = nodes0.edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));
    // Spread the graph more aggressively for big vaults — repulsion and
    // edge length scale with sqrt(N) so 300 nodes don't crush into the
    // centre. iterations also go up for bigger graphs.
    const N = Math.max(1, nodes.length);
    const lay = layoutGraph(nodes, edges, {
      width: WIDTH,
      height: HEIGHT,
      iterations: Math.min(220, 120 + Math.floor(N / 4)),
      repulsion: 6000 + N * 30,
      edgeLength: Math.max(60, Math.min(160, 60 + Math.floor(Math.sqrt(N) * 4))),
      gravity: 0.015,
    });
    return {
      graph: { nodes, edges },
      layout: lay,
      truncated,
      allPathsCount: snap.allPaths.length,
    };
    // tick triggers a recompute when the underlying index mutates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, WIDTH, HEIGHT]);

  const byId = useMemo(() => {
    const m = new Map<string, LayoutNode>();
    for (const n of layout) m.set(n.id, n);
    return m;
  }, [layout]);

  // Pick which nodes get a visible label: the highest-degree ones (the
  // hubs) plus the active file. Everything else stays as a dot — labels
  // appear on hover. For tiny vaults (< 60 nodes) we just label
  // everything since there's room.
  const labeledIds = useMemo(() => {
    const set = new Set<string>();
    const activePath = activeTab?.path ?? null;
    if (activePath) set.add(activePath);
    if (layout.length <= 60) {
      for (const n of layout) set.add(n.id);
    } else {
      const top = [...layout].sort((a, b) => b.degree - a.degree).slice(0, LABEL_TOP_N);
      for (const n of top) if (n.degree > 0) set.add(n.id);
    }
    return set;
  }, [layout, activeTab]);

  async function openPath(path: string) {
    try {
      const loaded = await readFile(path);
      openLoadedFile(loaded);
      onClose();
    } catch (e) {
      console.error("graph open failed", e);
    }
  }

  const activePath = activeTab?.path ?? null;
  const noEdges = graph.edges.length === 0;
  const noNodes = graph.nodes.length === 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-canvas-light dark:bg-canvas-dark rounded-lg shadow-2xl border border-black/10 dark:border-white/15 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 dark:border-white/10">
          <div className="text-[12px] uppercase tracking-wide opacity-70">
            {t("graph.title")}
          </div>
          <div className="text-[11px] opacity-60 flex items-center gap-3">
            <span>
              {graph.nodes.length} {t("graph.nodes")} ・ {graph.edges.length}{" "}
              {t("graph.edges")}
            </span>
            {truncated && (
              <span className="text-amber-600 dark:text-amber-400">
                {t("graph.truncated", String(NODE_LIMIT))}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="opacity-60 hover:opacity-100 text-[14px] leading-none w-5 h-5 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
          <svg
            width={WIDTH}
            height={HEIGHT}
            className="block bg-black/[0.02] dark:bg-white/[0.02]"
          >
            <title>{t("graph.title")}</title>
            {graph.edges.map((e, i) => {
              const a = byId.get(e.source);
              const b = byId.get(e.target);
              if (!a || !b) return null;
              return (
                <line
                  key={`${e.source}->${e.target}|${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="currentColor"
                  strokeOpacity={0.22}
                  strokeWidth={Math.max(0.5, Math.min(3, (e.weight ?? 1) * 0.7))}
                />
              );
            })}
            {layout.map((n) => {
              const r = Math.max(2.5, Math.min(14, 2.5 + Math.sqrt(n.degree) * 2));
              const isActive = activePath === n.id;
              const isHover = hoverId === n.id;
              const showLabel = labeledIds.has(n.id) || isHover;
              return (
                <g
                  key={n.id}
                  onClick={() => openPath(n.id)}
                  onMouseEnter={() => setHoverId(n.id)}
                  onMouseLeave={() => setHoverId((cur) => (cur === n.id ? null : cur))}
                  className="cursor-pointer"
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={isHover ? r + 2 : r}
                    fill={isActive ? "#f59e0b" : "currentColor"}
                    fillOpacity={isActive ? 0.95 : isHover ? 0.85 : 0.45}
                  >
                    <title>{n.id}</title>
                  </circle>
                  {showLabel && (
                    <text
                      x={n.x}
                      y={n.y + r + 11}
                      textAnchor="middle"
                      className="text-[10px] fill-current"
                      fillOpacity={isActive || isHover ? 0.95 : 0.7}
                      pointerEvents="none"
                    >
                      {n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {(noNodes || noEdges) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center max-w-[440px] px-6 py-4 rounded-md bg-canvas-light/90 dark:bg-canvas-dark/90 border border-black/10 dark:border-white/10 shadow">
                <div className="text-[13px] font-semibold mb-1">
                  {noNodes ? "No files in this vault" : "No wikilinks yet"}
                </div>
                <div className="text-[12px] opacity-70 leading-relaxed">
                  {noNodes
                    ? "Open a folder that contains .md files."
                    : noEdges && allPathsCount > 0
                      ? `${allPathsCount} files indexed but no [[wikilinks]] found between them. Add some links — they'll appear here as edges. If you've just opened this vault, run "Rebuild Link Index" from the command palette.`
                      : 'Run "Rebuild Link Index" from the command palette.'}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-2 text-[11px] opacity-60 border-t border-black/5 dark:border-white/10">
          {t("graph.help")} ・ Showing labels for top {LABEL_TOP_N} hubs; hover any dot
          for its filename.
        </div>
      </div>
    </div>
  );
}
