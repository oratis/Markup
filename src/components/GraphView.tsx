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

const WIDTH = 900;
const HEIGHT = 600;
const NODE_LIMIT = 300;

export function GraphView({ onClose }: Props) {
  const t = useT();
  const activeTab = useAppStore(getActiveTab);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);
  const [tick, setTick] = useState(0);

  // Re-render when the index changes (rare during a graph view session,
  // but covers the "save while open" case).
  useEffect(() => subscribeIndex(() => setTick((x) => x + 1)), []);

  const { graph, layout, truncated } = useMemo(() => {
    const snap = readIndexSnapshot();
    const nodes0 = buildGraphFromLinkIndex(snap.index, snap.allPaths);
    const truncated = nodes0.nodes.length > NODE_LIMIT;
    const nodes = truncated ? nodes0.nodes.slice(0, NODE_LIMIT) : nodes0.nodes;
    const idSet = new Set(nodes.map((n) => n.id));
    const edges = nodes0.edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));
    const lay = layoutGraph(nodes, edges, { width: WIDTH, height: HEIGHT });
    return { graph: { nodes, edges }, layout: lay, truncated };
    // tick triggers a recompute when the underlying index mutates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const byId = useMemo(() => {
    const m = new Map<string, LayoutNode>();
    for (const n of layout) m.set(n.id, n);
    return m;
  }, [layout]);

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
          <div className="text-[11px] opacity-60">
            {graph.nodes.length} {t("graph.nodes")} ・ {graph.edges.length}{" "}
            {t("graph.edges")}
            {truncated && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                {t("graph.truncated", String(NODE_LIMIT))}
              </span>
            )}
          </div>
        </div>
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
                strokeOpacity={0.25}
                strokeWidth={Math.max(0.5, Math.min(3, (e.weight ?? 1) * 0.7))}
              />
            );
          })}
          {layout.map((n) => {
            const r = Math.max(3, Math.min(14, 3 + Math.sqrt(n.degree) * 2));
            const isActive = activePath === n.id;
            return (
              <g key={n.id} onClick={() => openPath(n.id)} className="cursor-pointer">
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill={isActive ? "#f59e0b" : "currentColor"}
                  fillOpacity={isActive ? 0.95 : 0.55}
                >
                  <title>{n.id}</title>
                </circle>
                <text
                  x={n.x}
                  y={n.y + r + 11}
                  textAnchor="middle"
                  className="text-[10px] fill-current"
                  fillOpacity={0.7}
                  pointerEvents="none"
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="px-4 py-2 text-[11px] opacity-60 border-t border-black/5 dark:border-white/10">
          {t("graph.help")}
        </div>
      </div>
    </div>
  );
}
