import { createFileRoute, Link } from "@tanstack/react-router";
import { validateGraph } from "@/lib/graph/runtime";
import { getProject } from "@/projects/registry";

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

  const m = project.manifest;
  const graph = project.graph;
  const locIds = Object.keys(graph.locations);
  const inspectCount = locIds.reduce(
    (n, id) => n + graph.locations[id]!.inspect.length,
    0,
  );
  const npcCount = locIds.reduce(
    (n, id) => n + (graph.locations[id]!.npcs?.length ?? 0),
    0,
  );
  const errors = validateGraph(graph);

  return (
    <main className="min-h-dvh bg-bg px-5 py-8 text-ink">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/studio"
          className="text-xs uppercase tracking-[0.18em] text-muted"
        >
          ← Мастерская
        </Link>
        <h1 className="mt-4 font-display text-4xl text-paper">{m.title}</h1>
        <p className="mt-1 text-xs text-faint">
          id: {m.id} · v{m.version} · start: {graph.startLocationId}
        </p>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat label="Локации" value={String(locIds.length)} />
          <Stat label="Осмотры" value={String(inspectCount)} />
          <Stat label="NPC" value={String(npcCount)} />
        </section>

        <section className="mt-6 rounded-[18px] border border-line p-4">
          <h2 className="text-xs uppercase tracking-[0.18em] text-brass">
            Локации графа
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {locIds.map((id) => {
              const loc = graph.locations[id]!;
              return (
                <li key={id}>
                  <span className="text-paper">{loc.name ?? id}</span>
                  <span className="text-faint">
                    {" "}
                    · выходов {loc.exits.length} · осмотров {loc.inspect.length}{" "}
                    · NPC {loc.npcs?.length ?? 0}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {errors.length > 0 ? (
          <section className="mt-4 rounded-[18px] border border-danger/40 p-4 text-sm text-danger">
            <p className="font-medium">Ошибки графа</p>
            <ul className="mt-2 list-disc pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="mt-4 text-xs text-faint">validateGraph: ok</p>
        )}

        <section className="mt-6 rounded-[18px] border border-dashed border-line p-4 text-sm text-muted">
          <p className="font-medium text-paper">P3 — node canvas</p>
          <p className="mt-2 text-xs leading-relaxed text-faint">
            Канон: <code>src/projects/{m.id}/graph.ts</code>. Правки через git.
            Визуальный редактор нод — следующий этап.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/project/$projectId"
            params={{ projectId: m.id }}
            className="rounded-[14px] bg-paper px-4 py-2 text-sm text-bg"
          >
            Карточка проекта
          </Link>
          <Link
            to="/"
            className="rounded-[14px] border border-line px-4 py-2 text-sm text-paper"
          >
            Хаб
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-line px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-faint">{label}</p>
      <p className="mt-1 font-display text-xl text-paper">{value}</p>
    </div>
  );
}
