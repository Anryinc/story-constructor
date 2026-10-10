import { CharacterSelect } from "@/components/character-select";
import { ROSTER_BY_ID } from "@/lib/campaign/roster";
import type { ActionIntent, TurnSnapshot } from "@/lib/game/turn-types";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Tab = "act" | "clues" | "log" | "role";

export function PhonePlay({
  room,
  clientId,
  onClaim,
  onIntent,
  onClearIntent,
  claimError,
  actionError,
}: {
  room: TurnSnapshot;
  clientId: string;
  onClaim: (id: string | null) => void;
  onIntent: (intent: ActionIntent) => void;
  onClearIntent: () => void;
  claimError?: string | null;
  actionError?: string | null;
}) {
  const [tab, setTab] = useState<Tab>("act");
  const me = room.myCharacterId ? ROSTER_BY_ID[room.myCharacterId] : null;

  if (room.status === "lobby" || !me) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg bg-bg px-4 py-5">
        <p className="text-[11px] uppercase tracking-[0.24em] text-brass">
          {room.projectTitle}
        </p>
        <h1 className="mt-1 font-display text-2xl text-paper">Стол {room.code}</h1>
        <CharacterSelect
          takenCharacterIds={room.takenCharacterIds}
          seats={room.seats}
          myCharacterId={room.myCharacterId}
          myClientId={clientId}
          locked={room.status === "playing"}
          onClaim={onClaim}
          error={claimError}
        />
        {me ? (
          <p className="mt-4 text-sm text-muted">Ждём старта на хабе (ПК).</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg">
      <div className="relative h-40 overflow-hidden">
        {room.myLocationImage ? (
          <img
            src={room.myLocationImage}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-paper-dim/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brass">
            Раунд {room.round} · {room.intentsReady}/{room.intentsNeeded} ходов
          </p>
          <h1 className="font-display text-2xl text-paper">
            {room.myLocationName ?? "…"}
          </h1>
          {room.hereWith.length > 0 ? (
            <p className="text-xs text-muted">
              Здесь же: {room.hereWith.join(", ")}
            </p>
          ) : (
            <p className="text-xs text-faint">Вы одни в этой локации</p>
          )}
        </div>
      </div>

      {room.lastResult ? (
        <div className="mx-4 mt-3 rounded-[14px] border border-line bg-bg/80 px-3 py-2 text-sm text-muted">
          {room.lastResult}
        </div>
      ) : null}
      {actionError ? (
        <p className="mx-4 mt-2 text-sm text-danger">{actionError}</p>
      ) : null}

      <div className="flex gap-1 border-b border-line px-2 pt-3">
        {(
          [
            ["act", "Ход"],
            ["clues", "Улики"],
            ["log", "Журнал"],
            ["role", "Роль"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-t-[12px] py-2 text-xs uppercase tracking-[0.14em]",
              tab === id ? "bg-paper/10 text-paper" : "text-faint",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "act" ? (
          <div className="space-y-2">
            {room.myIntent ? (
              <div className="rounded-[14px] border border-paper/30 bg-paper/5 px-3 py-3">
                <p className="text-xs text-brass">Ход сдан</p>
                <p className="mt-1 text-sm text-paper">
                  {labelIntent(room.myIntent, room)}
                </p>
                <button
                  type="button"
                  onClick={onClearIntent}
                  className="mt-2 text-xs text-muted underline"
                >
                  Отменить
                </button>
              </div>
            ) : (
              room.availableActions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onIntent(a.intent)}
                  className="w-full rounded-[14px] border border-line px-3 py-3 text-left hover:border-paper/40"
                >
                  <p className="text-sm text-paper">{a.label}</p>
                  {a.detail ? (
                    <p className="mt-1 text-xs text-faint">{a.detail}</p>
                  ) : null}
                </button>
              ))
            )}
          </div>
        ) : null}

        {tab === "clues" ? (
          <ul className="space-y-3">
            {room.myClues.length === 0 ? (
              <p className="text-sm text-muted">Пока пусто. Осматривайте локации.</p>
            ) : (
              room.myClues.map((c) => (
                <li
                  key={c.id}
                  className="rounded-[14px] border border-line px-3 py-3"
                >
                  <p className="text-sm text-paper">{c.title}</p>
                  <p className="mt-1 text-xs text-muted">{c.body}</p>
                  <p className="mt-1 text-[10px] text-faint">{c.source}</p>
                </li>
              ))
            )}
          </ul>
        ) : null}

        {tab === "log" ? (
          <ul className="space-y-3">
            {room.myJournal.map((j) => (
              <li key={j.id} className="border-b border-line/50 pb-2">
                <p className="text-[10px] text-faint">раунд {j.round}</p>
                <p className="text-sm text-paper">{j.title}</p>
                <p className="text-xs text-muted">{j.body}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "role" && me ? (
          <div className="space-y-2">
            <p className="font-display text-2xl text-paper">{me.name}</p>
            <p className="text-xs text-brass">{me.pathwayName}</p>
            <p className="text-sm text-muted">{me.pathwayPlain}</p>
            <p className="text-sm italic text-faint">«{me.quote}»</p>
            <ul className="mt-4 space-y-2">
              {me.abilities.map((a) => (
                <li key={a.id} className="rounded-[12px] border border-line p-2">
                  <p className="text-sm text-paper">{a.name}</p>
                  <p className="text-xs text-muted">{a.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function labelIntent(intent: ActionIntent, room: TurnSnapshot): string {
  const match = room.availableActions.find((a) => {
    const x = a.intent;
    if (x.type !== intent.type) return false;
    if (x.type === "move" && intent.type === "move")
      return x.toLocationId === intent.toLocationId;
    if (x.type === "inspect" && intent.type === "inspect")
      return x.targetId === intent.targetId;
    if (x.type === "share" && intent.type === "share")
      return x.clueId === intent.clueId;
    if (x.type === "ability" && intent.type === "ability")
      return x.abilityId === intent.abilityId;
    return x.type === "wait";
  });
  return match?.label ?? intent.type;
}
