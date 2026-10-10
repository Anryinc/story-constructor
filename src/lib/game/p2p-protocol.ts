/** Wire messages between host turn-engine and guest phones over WebRTC. */

import type { TurnSnapshot, ActionIntent } from "./turn-types";

export type GuestToHost =
  | { t: "hello"; clientId: string; displayName?: string }
  | { t: "claim"; clientId: string; characterId: string | null }
  | { t: "start"; clientId: string }
  | { t: "intent"; clientId: string; intent: ActionIntent }
  | { t: "clearIntent"; clientId: string }
  | { t: "ping" };

export type HostToGuest =
  | { t: "snapshot"; room: TurnSnapshot }
  | { t: "actionResult"; ok: boolean; error?: string }
  | { t: "hostGone" };

export function parseGuestMessage(raw: unknown): GuestToHost | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as { t?: string };
  if (typeof m.t !== "string") return null;
  return raw as GuestToHost;
}

export function parseHostMessage(raw: unknown): HostToGuest | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as { t?: string };
  if (typeof m.t !== "string") return null;
  return raw as HostToGuest;
}
