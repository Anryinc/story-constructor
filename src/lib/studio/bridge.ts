/** Convert runtime GraphDocument ↔ StudioGraph for the node canvas. */

import type { GraphDocument, GraphLocation } from "@/lib/graph/types";
import {
  NODE_KIND_META,
  type StudioEdge,
  type StudioGraph,
  type StudioNode,
} from "./graph-types";

const COL_W = 260;
const ROW_H = 140;

/** Stable studio node id for a location */
export function locNodeId(locationId: string) {
  return `loc_${locationId}`;
}

export function graphDocumentToStudio(doc: GraphDocument): StudioGraph {
  const ids = Object.keys(doc.locations);
  const nodes: StudioNode[] = ids.map((id, i) => {
    const loc = doc.locations[id]!;
    const col = i % 3;
    const row = Math.floor(i / 3);
    return {
      id: locNodeId(id),
      kind: "location" as const,
      x: 80 + col * COL_W,
      y: 80 + row * ROW_H,
      data: {
        title: loc.name ?? id,
        locationId: id,
        body: summarizeLocation(loc),
      },
      ports: NODE_KIND_META.location.defaultPorts.map((p) => ({ ...p })),
    };
  });

  const edges: StudioEdge[] = [];
  for (const id of ids) {
    const loc = doc.locations[id]!;
    for (const ex of loc.exits) {
      if (!doc.locations[ex.to]) continue;
      edges.push({
        id: `e_${id}_${ex.to}`,
        from: locNodeId(id),
        fromPort: "out",
        to: locNodeId(ex.to),
        toPort: "in",
        label: ex.label,
      });
    }
  }

  return { version: 1, nodes, edges };
}

function summarizeLocation(loc: GraphLocation): string {
  const parts = [
    `выходов: ${loc.exits.length}`,
    `осмотров: ${loc.inspect.length}`,
    `NPC: ${loc.npcs?.length ?? 0}`,
  ];
  return parts.join(" · ");
}

/**
 * Apply studio location positions + exit edges back onto a GraphDocument.
 * Non-location studio nodes are ignored (P3 focuses on location mesh).
 * Inspect/NPC content is preserved from `base`.
 */
export function studioToGraphDocument(
  studio: StudioGraph,
  base: GraphDocument,
): GraphDocument {
  const locations: GraphDocument["locations"] = { ...base.locations };

  // Ensure every location node exists in doc
  for (const n of studio.nodes) {
    if (n.kind !== "location") continue;
    const lid = n.data.locationId ?? n.id.replace(/^loc_/, "");
    if (!locations[lid]) {
      locations[lid] = {
        id: lid,
        name: n.data.title || lid,
        exits: [],
        inspect: [],
        npcs: [],
      };
    } else if (n.data.title) {
      locations[lid] = { ...locations[lid]!, name: n.data.title };
    }
  }

  // Rebuild exits from edges between location nodes
  const exitMap = new Map<string, { to: string; label?: string }[]>();
  for (const e of studio.edges) {
    const fromNode = studio.nodes.find((n) => n.id === e.from);
    const toNode = studio.nodes.find((n) => n.id === e.to);
    if (!fromNode || !toNode) continue;
    if (fromNode.kind !== "location" || toNode.kind !== "location") continue;
    const fromId = fromNode.data.locationId ?? fromNode.id.replace(/^loc_/, "");
    const toId = toNode.data.locationId ?? toNode.id.replace(/^loc_/, "");
    const list = exitMap.get(fromId) ?? [];
    if (!list.some((x) => x.to === toId)) {
      list.push({ to: toId, label: e.label });
    }
    exitMap.set(fromId, list);
  }

  for (const [id, loc] of Object.entries(locations)) {
    const nextExits = exitMap.get(id);
    if (!nextExits) continue;
    // Preserve flag gates from previous exits when same `to`
    const merged = nextExits.map((ex) => {
      const prev = loc.exits.find((p) => p.to === ex.to);
      return prev
        ? { ...prev, label: ex.label ?? prev.label }
        : { to: ex.to, label: ex.label };
    });
    locations[id] = { ...loc, exits: merged };
  }

  return {
    ...base,
    locations,
  };
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function graphToTsModule(doc: GraphDocument, exportName = "projectGraph"): string {
  const json = JSON.stringify(doc, null, 2);
  return `import type { GraphDocument } from "@/lib/graph/types";\n\nexport const ${exportName}: GraphDocument = ${json} as GraphDocument;\n`;
}
