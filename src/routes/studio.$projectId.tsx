import { createFileRoute, Link } from "@tanstack/react-router";
import { GraphCanvas } from "@/components/studio/graph-canvas";
import { validateGraph } from "@/lib/graph/runtime";
import type { GraphDocument } from "@/lib/graph/types";
import {
  downloadText,
  graphDocumentToStudio,
  graphToTsModule,
  studioToGraphDocument,
} from "@/lib/studio/bridge";
import { clearDraft, loadDraft, saveDraft } from "@/lib/studio/draft";
import type { StudioGraph } from "@/lib/studio/graph-types";
import { getProject } from "@/projects/registry";
import { useCallback, useMemo, useState } from "react";

export const Route = createFileRoute("/studio/$projectId")({
  component: StudioProject,
});

function StudioProject() {
  const { projectId } = Route.useParams();
  const project = getProject(projectId);

  if (!project) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6">
        <p className="font-display text-2xl text-paper">Нет такого проекта</p>
        <Link to="/studio" className="text-sm underline">
          К списку
        </Link>
      </main>
    );
  }

  return <StudioWorkspace projectId={projectId} canonical={project.graph} title={project.manifest.title} />;
}

function StudioWorkspace({
  projectId,
  canonical,
  title,
}: {
  projectId: string;
  canonical: GraphDocument;
  title: string;
}) {
  const [doc, setDoc] = useState<GraphDocument>(() => loadDraft(projectId) ?? structuredClone(canonical));
  const [studio, setStudio] = useState<StudioGraph>(() =>
    graphDocumentToStudio(loadDraft(projectId) ?? canonical),
  );
  const [jsonText, setJsonText] = useState(() => JSON.stringify(doc, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"canvas" | "json">("canvas");
  const [dirty, setDirty] = useState(false);

  const errors = useMemo(() => validateGraph(doc), [doc]);

  const persist = useCallback(
    (next: GraphDocument, nextStudio?: StudioGraph) => {
      setDoc(next);
      saveDraft(projectId, next);
      setJsonText(JSON.stringify(next, null, 2));
      setJsonError(null);
      setDirty(true);
      if (nextStudio) setStudio(nextStudio);
      else setStudio(graphDocumentToStudio(next));
    },
    [projectId],
  );

  const onStudioChange = (g: StudioGraph) => {
    setStudio(g);
    const merged = studioToGraphDocument(g, doc);
    setDoc(merged);
    saveDraft(projectId, merged);
    setJsonText(JSON.stringify(merged, null, 2));
    setDirty(true);
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as GraphDocument;
      if (!parsed.locations || !parsed.startLocationId) {
        setJsonError("Нужны startLocationId и locations");
        return;
      }
      persist(parsed);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "JSON error");
    }
  };

  const resetCanonical = () => {
    clearDraft(projectId);
    persist(structuredClone(canonical));
    setDirty(false);
  };

  const exportJson = () => {
    downloadText(`${projectId}-graph.json`, JSON.stringify(doc, null, 2));
  };

  const exportTs = () => {
    const name = projectId === "cherwood" ? "cherwoodGraph" : `${projectId}Graph`;
    downloadText(`graph.ts`, graphToTsModule(doc, name));
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <Link to="/studio" className="text-xs uppercase tracking-[0.16em] text-muted">
          ← Мастерская
        </Link>
        <h1 className="font-display text-xl text-paper">{title}</h1>
        <span className="text-xs text-faint">{projectId}</span>
        {dirty ? (
          <span className="rounded-full bg-brass/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-brass">
            черновик
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPanel("canvas")}
            className={`rounded-full px-3 py-1 text-xs ${panel === "canvas" ? "bg-paper text-bg" : "border border-line text-muted"}`}
          >
            Canvas
          </button>
          <button
            type="button"
            onClick={() => setPanel("json")}
            className={`rounded-full px-3 py-1 text-xs ${panel === "json" ? "bg-paper text-bg" : "border border-line text-muted"}`}
          >
            JSON
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="rounded-full border border-line px-3 py-1 text-xs text-paper"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={exportTs}
            className="rounded-full border border-line px-3 py-1 text-xs text-paper"
          >
            Export graph.ts
          </button>
          <button
            type="button"
            onClick={resetCanonical}
            className="rounded-full border border-line px-3 py-1 text-xs text-muted"
          >
            Сброс к git
          </button>
        </div>
      </header>

      {errors.length > 0 ? (
        <div className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-xs text-danger">
          {errors.join(" · ")}
        </div>
      ) : (
        <div className="border-b border-line px-4 py-1 text-[10px] text-faint">
          validateGraph: ok · локаций {Object.keys(doc.locations).length} · start{" "}
          {doc.startLocationId}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-[50vh] flex-1 lg:min-h-0">
          {panel === "canvas" ? (
            <GraphCanvas graph={studio} onChange={onStudioChange} />
          ) : (
            <div className="flex h-full min-h-[50vh] flex-col p-3">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="min-h-[40vh] flex-1 resize-none rounded-[14px] border border-line bg-bg/80 p-3 font-mono text-xs text-paper"
                spellCheck={false}
              />
              {jsonError ? (
                <p className="mt-2 text-sm text-danger">{jsonError}</p>
              ) : null}
              <button
                type="button"
                onClick={applyJson}
                className="mt-2 h-10 rounded-[12px] bg-paper text-sm text-bg"
              >
                Применить JSON к черновику
              </button>
            </div>
          )}
        </div>

        <aside className="w-full border-t border-line p-4 lg:w-80 lg:border-l lg:border-t-0">
          <h2 className="text-xs uppercase tracking-[0.18em] text-brass">Git</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Канон в репозитории:{" "}
            <code className="text-faint">src/projects/{projectId}/graph.ts</code>.
            Черновик в этой вкладке (sessionStorage). Чтобы сохранить навсегда:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-muted">
            <li>Export graph.ts</li>
            <li>Замените файл в репо</li>
            <li>git commit + push</li>
          </ol>
          <p className="mt-3 text-xs text-faint">
            На canvas: тяните локации, соединяйте порты (выходы). Новые типы нод
            (сцена/ветка) пока для раскладки; runtime читает GraphDocument.
          </p>
          <Link
            to="/project/$projectId"
            params={{ projectId }}
            className="mt-4 inline-block text-xs text-paper underline"
          >
            Карточка проекта
          </Link>
        </aside>
      </div>
    </div>
  );
}
