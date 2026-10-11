import { createFileRoute, Link } from "@tanstack/react-router";
import { BUILD_STAMP } from "@/lib/build-stamp";
import { listProjects } from "@/projects/registry";

export const Route = createFileRoute("/")({ component: HubPage });

function HubPage() {
  const projects = listProjects();

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <header className="mx-auto flex max-w-5xl items-end justify-between gap-4 px-5 pb-2 pt-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-brass">
            Стол проектов
          </p>
          <h1 className="mt-2 font-display text-4xl text-paper md:text-5xl">
            Активные сценарии
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Выберите дело. Большой экран станет хабом стола; телефоны — ходами и
            личными находками.
          </p>
        </div>
        <Link
          to="/studio"
          className="shrink-0 rounded-full border border-line px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted hover:border-paper hover:text-paper"
        >
          Мастерская
        </Link>
      </header>

      <section className="mx-auto grid max-w-5xl gap-4 px-5 py-8 sm:grid-cols-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            to="/project/$projectId"
            params={{ projectId: p.id }}
            className="group relative overflow-hidden rounded-[22px] border border-line bg-bg/80 transition hover:border-paper/40"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={p.coverImage}
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
              <span
                className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${
                  p.status === "playable"
                    ? "bg-paper text-bg"
                    : "border border-line bg-bg/70 text-muted"
                }`}
              >
                {p.status === "playable" ? "можно играть" : "черновик"}
              </span>
            </div>
            <div className="relative -mt-10 space-y-2 px-4 pb-5 pt-2">
              <h2 className="font-display text-2xl text-paper">{p.title}</h2>
              {p.subtitle ? (
                <p className="text-[11px] uppercase tracking-[0.2em] text-brass">
                  {p.subtitle}
                </p>
              ) : null}
              <p className="text-sm leading-relaxed text-muted">{p.blurb}</p>
              <p className="text-xs text-faint">
                {p.playersMin}–{p.playersMax} игрока
                {p.estimatedMinutes ? ` · ~${p.estimatedMinutes} мин` : ""}
                {" · "}
                {p.tags.slice(0, 3).join(" · ")}
              </p>
            </div>
          </Link>
        ))}
      </section>

      <footer className="mx-auto max-w-5xl px-5 pb-10 text-xs text-faint">
        Сценарии в git (`src/projects/`). Build: {BUILD_STAMP}
      </footer>
    </main>
  );
}
