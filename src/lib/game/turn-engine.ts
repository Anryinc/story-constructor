/**
 * Host-authoritative turn-based table (P1).
 * Personal locations, 1 action/round, share same-location clues.
 */

import { LOCATION_BY_ID } from "@/lib/campaign/locations";
import { MAX_PARTY, ROSTER_BY_ID } from "@/lib/campaign/roster";
import type { CluePublic, PrivateNote, SeatPublic } from "@/lib/campaign/types";
import {
  CHERWOOD_MAP,
  CHERWOOD_START_LOCATION,
} from "@/projects/cherwood/map";
import { getProject } from "@/projects/registry";
import { newId } from "./ids";
import type {
  ActionIntent,
  ActionOption,
  JournalEntry,
  SharePayload,
  TurnPhase,
  TurnSnapshot,
} from "./turn-types";

type Seat = {
  clientId: string;
  displayName: string;
  characterId: string | null;
};

function intentKey(intent: ActionIntent): string {
  switch (intent.type) {
    case "wait":
      return "wait";
    case "move":
      return `move:${intent.toLocationId}`;
    case "inspect":
      return `inspect:${intent.targetId}`;
    case "share":
      return `share:${intent.clueId}`;
    case "ability":
      return `ability:${intent.abilityId}`;
  }
}

export class TurnEngine {
  readonly code: string;
  readonly hostClientId: string;
  readonly projectId: string;
  private projectTitle: string;
  private phase: TurnPhase = "lobby";
  private round = 0;
  private seats: Seat[] = [];
  private locationOf = new Map<string, string>();
  private cluesOf = new Map<string, CluePublic[]>();
  private notesOf = new Map<string, PrivateNote[]>();
  private journalOf = new Map<string, JournalEntry[]>();
  private inspected = new Map<string, Set<string>>(); // clientId -> target ids
  private intents = new Map<string, ActionIntent>();
  private lastResultOf = new Map<string, string>();
  private shareBoard: SharePayload[] = [];
  private lastPublicEvent: string | null = null;
  private listeners = new Set<() => void>();

  constructor(code: string, hostClientId: string, projectId = "cherwood") {
    this.code = code.toUpperCase();
    this.hostClientId = hostClientId;
    this.projectId = projectId;
    const p = getProject(projectId);
    this.projectTitle = p?.manifest.title ?? projectId;
    this.seats.push({
      clientId: hostClientId,
      displayName: "Хост",
      characterId: null,
    });
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private playersWithRoles() {
    return this.seats.filter((s) => s.characterId);
  }

  ensureSeat(clientId: string, displayName = "Игрок") {
    if (this.seats.some((s) => s.clientId === clientId)) return { ok: true as const };
    if (this.seats.length >= MAX_PARTY + 1) {
      return { ok: false as const, error: "Стол заполнен" };
    }
    this.seats.push({ clientId, displayName, characterId: null });
    this.emit();
    return { ok: true as const };
  }

  claim(clientId: string, characterId: string | null) {
    this.ensureSeat(clientId);
    const seat = this.seats.find((s) => s.clientId === clientId);
    if (!seat) return { ok: false as const, error: "Нет места" };
    if (characterId) {
      if (!ROSTER_BY_ID[characterId]) return { ok: false as const, error: "Нет роли" };
      if (
        this.seats.some(
          (s) => s.characterId === characterId && s.clientId !== clientId,
        )
      ) {
        return { ok: false as const, error: "Уже занято" };
      }
      const n = this.seats.filter((s) => s.characterId).length;
      if (!seat.characterId && n >= MAX_PARTY) {
        return { ok: false as const, error: `Максимум ${MAX_PARTY}` };
      }
      seat.characterId = characterId;
      seat.displayName = ROSTER_BY_ID[characterId]!.name;
    } else {
      seat.characterId = null;
      seat.displayName = clientId === this.hostClientId ? "Хост" : "Игрок";
      this.locationOf.delete(clientId);
    }
    this.emit();
    return { ok: true as const };
  }

  start(clientId: string) {
    if (clientId !== this.hostClientId) {
      return { ok: false as const, error: "Только хост" };
    }
    const players = this.playersWithRoles();
    if (players.length === 0) {
      return { ok: false as const, error: "Нужна хотя бы одна роль" };
    }
    for (const s of players) {
      this.locationOf.set(s.clientId, CHERWOOD_START_LOCATION);
      this.cluesOf.set(s.clientId, []);
      this.journalOf.set(s.clientId, []);
      this.inspected.set(s.clientId, new Set());
    }
    this.round = 1;
    this.phase = "planning";
    this.intents.clear();
    this.lastPublicEvent = "Дело открыто. Первый раунд — планируйте ход.";
    this.emit();
    return { ok: true as const };
  }

  submitIntent(clientId: string, intent: ActionIntent) {
    if (this.phase !== "planning") {
      return { ok: false as const, error: "Сейчас нельзя ходить" };
    }
    const seat = this.seats.find((s) => s.clientId === clientId);
    if (!seat?.characterId) return { ok: false as const, error: "Нужна роль" };

    const options = this.actionsFor(clientId);
    const ok = options.some((o) => intentKey(o.intent) === intentKey(intent));
    if (!ok) return { ok: false as const, error: "Действие недоступно" };

    this.intents.set(clientId, intent);
    this.emit();

    const needed = this.playersWithRoles();
    if (needed.every((s) => this.intents.has(s.clientId))) {
      this.resolveRound();
    }
    return { ok: true as const };
  }

  clearIntent(clientId: string) {
    if (this.phase !== "planning") return { ok: false as const };
    this.intents.delete(clientId);
    this.emit();
    return { ok: true as const };
  }

  private resolveRound() {
    this.phase = "resolution";
    const players = this.playersWithRoles();

    // 1) moves first
    for (const s of players) {
      const intent = this.intents.get(s.clientId);
      if (intent?.type === "move") {
        const loc = this.locationOf.get(s.clientId);
        const node = loc ? CHERWOOD_MAP[loc] : null;
        if (node?.exits.includes(intent.toLocationId)) {
          this.locationOf.set(s.clientId, intent.toLocationId);
          const name = LOCATION_BY_ID[intent.toLocationId]?.name ?? intent.toLocationId;
          this.pushJournal(s.clientId, "Перемещение", `Вы перешли: ${name}.`);
          this.lastResultOf.set(s.clientId, `Вы в локации: ${name}`);
        }
      }
    }

    // 2) inspect / ability / wait / share
    for (const s of players) {
      const intent = this.intents.get(s.clientId);
      if (!intent || intent.type === "move") continue;

      if (intent.type === "wait") {
        this.pushJournal(s.clientId, "Ожидание", "Вы решили ничего не делать.");
        this.lastResultOf.set(s.clientId, "Вы ждали.");
        continue;
      }

      if (intent.type === "inspect") {
        this.resolveInspect(s.clientId, intent.targetId);
        continue;
      }

      if (intent.type === "share") {
        this.resolveShare(s.clientId, intent.clueId);
        continue;
      }

      if (intent.type === "ability") {
        this.resolveAbility(s.clientId, intent.abilityId);
      }
    }

    this.intents.clear();
    this.phase = "planning";
    this.round += 1;
    this.lastPublicEvent = `Раунд ${this.round - 1} закрыт. Планируйте раунд ${this.round}.`;
    this.emit();
  }

  private resolveInspect(clientId: string, targetId: string) {
    const loc = this.locationOf.get(clientId);
    const node = loc ? CHERWOOD_MAP[loc] : null;
    const target = node?.inspect.find((t) => t.id === targetId);
    if (!target) {
      this.lastResultOf.set(clientId, "Осматривать нечего.");
      return;
    }
    const seen = this.inspected.get(clientId) ?? new Set();
    if (target.once && seen.has(target.id)) {
      this.lastResultOf.set(clientId, "Вы уже это осматривали.");
      return;
    }
    seen.add(target.id);
    this.inspected.set(clientId, seen);

    this.pushJournal(clientId, target.label, target.result);
    this.lastResultOf.set(clientId, target.result);

    if (target.clue) {
      this.addClue(clientId, {
        id: target.clue.id,
        title: target.clue.title,
        body: target.clue.body,
        source: target.clue.source,
      });
    }
  }

  private resolveShare(clientId: string, clueId: string) {
    const bag = this.cluesOf.get(clientId) ?? [];
    const clue = bag.find((c) => c.id === clueId);
    if (!clue) {
      this.lastResultOf.set(clientId, "Нет такой улики.");
      return;
    }
    const loc = this.locationOf.get(clientId) ?? "street";
    const locName = LOCATION_BY_ID[loc]?.name ?? loc;
    const seat = this.seats.find((s) => s.clientId === clientId);
    const fromName = seat?.displayName ?? "Игрок";

    const payload: SharePayload = {
      id: newId(),
      fromPlayerId: clientId,
      fromName,
      locationId: loc,
      locationName: locName,
      title: clue.title,
      body: clue.body,
      round: this.round,
      createdAt: new Date().toISOString(),
    };
    this.shareBoard = [payload, ...this.shareBoard].slice(0, 12);

    // same-location only into baskets
    for (const s of this.playersWithRoles()) {
      if (this.locationOf.get(s.clientId) !== loc) continue;
      this.addClue(s.clientId, clue);
      if (s.clientId !== clientId) {
        this.pushJournal(
          s.clientId,
          "Поделились",
          `${fromName} показал(а): «${clue.title}».`,
        );
      }
    }

    this.pushJournal(clientId, "На общий экран", `Вы показали: «${clue.title}».`);
    this.lastResultOf.set(clientId, `Показано всем в «${locName}»: ${clue.title}`);
    this.lastPublicEvent = `${fromName} → ${locName}: ${clue.title}`;
  }

  private resolveAbility(clientId: string, abilityId: string) {
    const seat = this.seats.find((s) => s.clientId === clientId);
    const ch = seat?.characterId ? ROSTER_BY_ID[seat.characterId] : null;
    const ab = ch?.abilities.find((a) => a.id === abilityId);
    if (!ch || !ab) {
      this.lastResultOf.set(clientId, "Способность недоступна.");
      return;
    }
    const title = ab.name;
    const body = `${ab.detail}\n\n(${ab.summary})`;
    const list = this.notesOf.get(clientId) ?? [];
    list.unshift({
      id: newId(),
      title,
      body,
      createdAt: new Date().toISOString(),
    });
    this.notesOf.set(clientId, list.slice(0, 20));
    this.pushJournal(clientId, title, body);
    this.lastResultOf.set(clientId, `Способность «${title}»: ${ab.summary}`);

    if (ab.visibility === "public") {
      this.lastPublicEvent = `${ch.name} применяет «${title}».`;
    }
  }

  private addClue(clientId: string, clue: CluePublic) {
    const bag = this.cluesOf.get(clientId) ?? [];
    if (bag.some((c) => c.id === clue.id)) return;
    this.cluesOf.set(clientId, [...bag, clue]);
  }

  private pushJournal(clientId: string, title: string, body: string) {
    const list = this.journalOf.get(clientId) ?? [];
    list.unshift({
      id: newId(),
      round: this.round,
      title,
      body,
      createdAt: new Date().toISOString(),
    });
    this.journalOf.set(clientId, list.slice(0, 40));
  }

  private actionsFor(clientId: string): ActionOption[] {
    if (this.phase !== "planning") return [];
    const seat = this.seats.find((s) => s.clientId === clientId);
    if (!seat?.characterId) return [];
    const loc = this.locationOf.get(clientId);
    if (!loc) return [];
    const node = CHERWOOD_MAP[loc];
    if (!node) return [];

    const opts: ActionOption[] = [
      { id: "wait", intent: { type: "wait" }, label: "Ничего не делать" },
    ];

    for (const exit of node.exits) {
      const name = LOCATION_BY_ID[exit]?.name ?? exit;
      opts.push({
        id: `move:${exit}`,
        intent: { type: "move", toLocationId: exit },
        label: `Идти: ${name}`,
      });
    }

    const seen = this.inspected.get(clientId) ?? new Set();
    for (const t of node.inspect) {
      if (t.once && seen.has(t.id)) continue;
      opts.push({
        id: `inspect:${t.id}`,
        intent: { type: "inspect", targetId: t.id },
        label: `Осмотреть: ${t.label}`,
      });
    }

    const bag = this.cluesOf.get(clientId) ?? [];
    for (const c of bag) {
      opts.push({
        id: `share:${c.id}`,
        intent: { type: "share", clueId: c.id },
        label: `Показать всем здесь: ${c.title}`,
        detail: "Тратит действие. Улика — только у кого та же локация.",
      });
    }

    const ch = ROSTER_BY_ID[seat.characterId];
    for (const ab of ch?.abilities ?? []) {
      opts.push({
        id: `ability:${ab.id}`,
        intent: { type: "ability", abilityId: ab.id },
        label: `Способность: ${ab.name}`,
        detail: ab.summary,
      });
    }

    return opts;
  }

  snapshotFor(clientId: string): TurnSnapshot {
    const seat = this.seats.find((s) => s.clientId === clientId);
    const loc = this.locationOf.get(clientId) ?? null;
    const locDef = loc ? LOCATION_BY_ID[loc] : null;
    const players = this.playersWithRoles();
    const hereWith = players
      .filter(
        (s) =>
          s.clientId !== clientId && this.locationOf.get(s.clientId) === loc,
      )
      .map((s) => s.displayName);

    const status =
      this.phase === "lobby"
        ? "lobby"
        : this.phase === "ended"
          ? "ended"
          : "playing";

    return {
      mode: "turn",
      code: this.code,
      projectId: this.projectId,
      projectTitle: this.projectTitle,
      isHost: clientId === this.hostClientId,
      status,
      phase: this.phase,
      round: this.round,
      seats: this.seats.map(
        (s): SeatPublic => ({
          clientId: s.clientId,
          displayName: s.displayName,
          characterId: s.characterId,
        }),
      ),
      myCharacterId: seat?.characterId ?? null,
      takenCharacterIds: this.seats
        .map((s) => s.characterId)
        .filter((id): id is string => Boolean(id)),
      seatedCount: players.length,
      myLocationId: loc,
      myLocationName: locDef?.name ?? null,
      myLocationImage: locDef?.image ?? null,
      hereWith,
      availableActions: this.actionsFor(clientId),
      myIntent: this.intents.get(clientId) ?? null,
      intentsReady: [...this.intents.keys()].filter((id) =>
        players.some((p) => p.clientId === id),
      ).length,
      intentsNeeded: players.length,
      myClues: this.cluesOf.get(clientId) ?? [],
      myNotes: this.notesOf.get(clientId) ?? [],
      myJournal: this.journalOf.get(clientId) ?? [],
      shareBoard: this.shareBoard,
      lastResult: this.lastResultOf.get(clientId) ?? null,
      lastPublicEvent: this.lastPublicEvent,
    };
  }
}
