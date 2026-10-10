import { CharacterSelect } from "@/components/character-select";
import { TableQr } from "@/components/table-qr";
import type { TurnSnapshot } from "@/lib/game/turn-types";
import { ROSTER_BY_ID } from "@/lib/campaign/roster";

export function HubView({
  room,
  clientId,
  onClaim,
  onStart,
  claimError,
  startError,
}: {
  room: TurnSnapshot;
  clientId: string;
  onClaim: (id: string | null) => void;
  onStart: () => void;
  claimError?: string | null;
  startError?: string | null;
}) {
  const board = room.shareBoard[0];

  return (
    <div className="relative min-h-dvh bg-bg text-ink">
      {board ? (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg/90 to-bg" />
          <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-10">
            <p className="text-[11px] uppercase tracking-[0.28em] text-brass">
              На общем экране · {board.locationName} · {board.fromName}
            </p>
            <h1 className="mt-3 font-display text-4xl text-paper md:text-5xl">
              {board.title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              {board.body}
            </p>
          </div>
        </div>
      ) : room.myLocationImage && room.status === "playing" ? (
        <div className="absolute inset-0">
          <img
            src={room.myLocationImage}
            alt=""
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/50" />
        </div>
      ) : null}

      <div className="relative mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-5 py-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-brass">
              Хаб стола
            </p>
            <h1 className="mt-1 font-display text-3xl text-paper">
              {room.projectTitle}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Код {room.code}
              {room.status === "playing"
                ? ` · раунд ${room.round} · ходы ${room.intentsReady}/${room.intentsNeeded}`
                : " · лобби"}
            </p>
            {room.lastPublicEvent ? (
              <p className="mt-2 text-xs text-faint">{room.lastPublicEvent}</p>
            ) : null}
          </div>
          <TableQr code={room.code} />
        </header>

        {room.status === "lobby" ? (
          <section className="rounded-[22px] border border-line bg-bg/70 p-4">
            <CharacterSelect
              takenCharacterIds={room.takenCharacterIds}
              seats={room.seats}
              myCharacterId={room.myCharacterId}
              myClientId={clientId}
              locked={false}
              onClaim={onClaim}
              error={claimError}
            />
            <p className="mt-3 text-xs text-faint">
              Хост может взять роль здесь или с телефона. Игроки садятся по QR.
            </p>
            <button
              type="button"
              onClick={onStart}
              className="mt-4 h-12 w-full rounded-[16px] bg-paper text-sm font-medium text-bg"
            >
              Начать дело
            </button>
            {startError ? (
              <p className="mt-2 text-sm text-danger">{startError}</p>
            ) : null}
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-line bg-bg/70 p-4">
              <h2 className="text-xs uppercase tracking-[0.18em] text-brass">
                За столом
              </h2>
              <ul className="mt-3 space-y-2">
                {room.seats
                  .filter((s) => s.characterId)
                  .map((s) => {
                    const ch = s.characterId
                      ? ROSTER_BY_ID[s.characterId]
                      : null;
                    return (
                      <li
                        key={s.clientId}
                        className="flex items-center justify-between text-sm text-paper"
                      >
                        <span>{s.displayName}</span>
                        <span className="text-xs text-faint">
                          {ch?.pathwayName ?? ""}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
            <div className="rounded-[22px] border border-line bg-bg/70 p-4">
              <h2 className="text-xs uppercase tracking-[0.18em] text-brass">
                Доска (share)
              </h2>
              {room.shareBoard.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  Пока никто ничего не вынес на экран.
                </p>
              ) : (
                <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto">
                  {room.shareBoard.map((s) => (
                    <li key={s.id} className="border-b border-line/60 pb-2">
                      <p className="text-sm text-paper">{s.title}</p>
                      <p className="text-xs text-faint">
                        {s.fromName} · {s.locationName} · р.{s.round}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <p className="text-xs text-faint">
          Игра на телефонах. Здесь — QR, статус раунда и то, что игроки решили
          показать.
        </p>
      </div>
    </div>
  );
}
