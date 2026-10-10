import type { GraphDocument } from "@/lib/graph/types";

const key = (projectId: string) => `studio.draft.graph.${projectId}`;

export function loadDraft(projectId: string): GraphDocument | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as GraphDocument;
  } catch {
    return null;
  }
}

export function saveDraft(projectId: string, doc: GraphDocument) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(key(projectId), JSON.stringify(doc));
}

export function clearDraft(projectId: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(key(projectId));
}
