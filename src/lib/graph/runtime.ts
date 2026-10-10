import { LOCATION_BY_ID } from "@/lib/campaign/locations";
import type {
  GraphDocument,
  GraphInspectable,
  GraphLocation,
  GraphNpc,
  GraphTalkOption,
} from "./types";
import { gateOpen } from "./types";

export function getLocation(
  graph: GraphDocument,
  locationId: string,
): GraphLocation | null {
  return graph.locations[locationId] ?? null;
}

export function locationDisplayName(graph: GraphDocument, locationId: string): string {
  const node = graph.locations[locationId];
  return node?.name ?? LOCATION_BY_ID[locationId]?.name ?? locationId;
}

export function locationImage(locationId: string): string | null {
  return LOCATION_BY_ID[locationId]?.image ?? null;
}

export function availableExits(
  graph: GraphDocument,
  locationId: string,
  flags: Record<string, boolean>,
): { to: string; label: string }[] {
  const loc = getLocation(graph, locationId);
  if (!loc) return [];
  return loc.exits
    .filter((e) => gateOpen(e, flags))
    .map((e) => ({
      to: e.to,
      label: e.label ?? locationDisplayName(graph, e.to),
    }));
}

export function availableInspect(
  graph: GraphDocument,
  locationId: string,
  flags: Record<string, boolean>,
  alreadyInspected: Set<string>,
): GraphInspectable[] {
  const loc = getLocation(graph, locationId);
  if (!loc) return [];
  return loc.inspect.filter((t) => {
    if (!gateOpen(t, flags)) return false;
    if (t.once && alreadyInspected.has(t.id)) return false;
    return true;
  });
}

export function availableNpcs(
  graph: GraphDocument,
  locationId: string,
  flags: Record<string, boolean>,
): GraphNpc[] {
  const loc = getLocation(graph, locationId);
  if (!loc?.npcs) return [];
  return loc.npcs.filter((n) => gateOpen(n, flags));
}

export function availableTalkOptions(
  npc: GraphNpc,
  flags: Record<string, boolean>,
  usedOptionIds: Set<string>,
): GraphTalkOption[] {
  return npc.options.filter((o) => {
    if (!gateOpen(o, flags)) return false;
    if (o.once && usedOptionIds.has(`${npc.id}:${o.id}`)) return false;
    return true;
  });
}

export function validateGraph(graph: GraphDocument): string[] {
  const errors: string[] = [];
  if (!graph.locations[graph.startLocationId]) {
    errors.push(`startLocationId missing: ${graph.startLocationId}`);
  }
  for (const [id, loc] of Object.entries(graph.locations)) {
    if (loc.id !== id) errors.push(`location key/id mismatch: ${id}`);
    for (const e of loc.exits) {
      if (!graph.locations[e.to]) errors.push(`${id} exit → unknown ${e.to}`);
    }
  }
  return errors;
}
