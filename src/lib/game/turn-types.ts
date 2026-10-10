import type { CluePublic, PrivateNote, SeatPublic } from "@/lib/campaign/types";

export type TurnPhase = "lobby" | "planning" | "resolution" | "aftermath" | "ended";

export type ActionIntent =
  | { type: "wait" }
  | { type: "move"; toLocationId: string }
  | { type: "inspect"; targetId: string }
  | { type: "talk"; npcId: string; optionId: string }
  | { type: "share"; clueId: string }
  | { type: "ability"; abilityId: string };

export type ActionOption = {
  id: string;
  intent: ActionIntent;
  label: string;
  detail?: string;
};

export type SharePayload = {
  id: string;
  fromPlayerId: string;
  fromName: string;
  locationId: string;
  locationName: string;
  title: string;
  body: string;
  round: number;
  createdAt: string;
};

export type JournalEntry = {
  id: string;
  round: number;
  title: string;
  body: string;
  createdAt: string;
};

export type TurnSnapshot = {
  mode: "turn";
  code: string;
  projectId: string;
  projectTitle: string;
  isHost: boolean;
  status: "lobby" | "playing" | "ended";
  phase: TurnPhase;
  round: number;
  seats: SeatPublic[];
  myCharacterId: string | null;
  takenCharacterIds: string[];
  seatedCount: number;
  myLocationId: string | null;
  myLocationName: string | null;
  myLocationImage: string | null;
  /** NPC intros visible in this location */
  hereNpcs: { id: string; name: string; intro?: string }[];
  hereWith: string[];
  availableActions: ActionOption[];
  myIntent: ActionIntent | null;
  intentsReady: number;
  intentsNeeded: number;
  myClues: CluePublic[];
  myNotes: PrivateNote[];
  myJournal: JournalEntry[];
  shareBoard: SharePayload[];
  lastResult: string | null;
  lastPublicEvent: string | null;
};
