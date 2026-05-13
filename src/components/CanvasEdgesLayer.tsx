/**
 * SVG overlay that renders every edge in the doc. Sits inside the
 * world layer so pan/zoom transforms it together with the node divs.
 * One `<svg>` element with `overflow: visible` so paths can extend
 * beyond the wrapping rect (we don't track an actual extent).
 */

import { useMemo } from "react";
import { buildEdgePath } from "../lib/canvas-edge-geom";
import type { CanvasDoc } from "../lib/canvas-format";

interface Props {
  doc: CanvasDoc;
  selection: ReadonlySet<string>;
}

export function CanvasEdgesLayer({ doc, selection }: Props) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, (typeof doc.nodes)[number]>();
    for (const n of doc.nodes) m.set(n.id, n);
    return m;
  }, [doc.nodes]);

  return (
    <svg
      data-testid="canvas-edges-svg"
      // pointer-events="none" on the SVG itself so it doesn't eat clicks
      // through to the world; individual paths re-enable events so the
      // user can click an edge to select it (B211).
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: "visible" }}
    >
      <title>Canvas edges</title>
      {doc.edges.map((edge) => {
        const from = nodeMap.get(edge.fromNode);
        const to = nodeMap.get(edge.toNode);
        if (!from || !to) return null; // dangling ref — skip
        const { d, mid } = buildEdgePath(from, to, edge.fromSide, edge.toSide);
        const isSelected = selection.has(edge.id);
        const stroke = edgeColor(edge.color, isSelected);
        return (
          <g key={edge.id} data-testid={`canvas-edge-${edge.id}`}>
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={isSelected ? 3 : 2}
              className="pointer-events-auto"
              data-testid={`canvas-edge-${edge.id}-path`}
            />
            {edge.label ? (
              <g
                transform={`translate(${mid.x}, ${mid.y})`}
                className="pointer-events-auto"
              >
                <rect
                  x={-edge.label.length * 3.5 - 6}
                  y={-9}
                  width={edge.label.length * 7 + 12}
                  height={18}
                  rx={4}
                  fill="white"
                  fillOpacity={0.9}
                  stroke={stroke}
                  strokeOpacity={0.4}
                  strokeWidth={1}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fill="currentColor"
                  data-testid={`canvas-edge-${edge.id}-label`}
                >
                  {edge.label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Map Obsidian's numeric colour scheme (1–6) to actual stroke colours.
 *  Falls back to neutral when no colour given, blue when selected. */
function edgeColor(color: string | undefined, selected: boolean): string {
  if (selected) return "#3b82f6";
  if (!color) return "rgba(0,0,0,0.45)";
  switch (color) {
    case "1":
      return "#ef4444"; // red
    case "2":
      return "#f97316"; // orange
    case "3":
      return "#eab308"; // yellow
    case "4":
      return "#22c55e"; // green
    case "5":
      return "#06b6d4"; // cyan
    case "6":
      return "#8b5cf6"; // purple
    default:
      // Raw colour value (e.g. "#abc123") passes through.
      return color;
  }
}
