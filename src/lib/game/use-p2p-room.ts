import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { P2PRoom, type PeerInfo } from "@/lib/multiplayer/p2p";
import { getClientId } from "./client-id";
import { makeRoomCode } from "./ids";
import {
  parseGuestMessage,
  parseHostMessage,
  type GuestToHost,
  type HostToGuest,
} from "./p2p-protocol";
import { TurnEngine } from "./turn-engine";
import type { ActionIntent, TurnSnapshot } from "./turn-types";

function useClientIdStable() {
  return useMemo(() => getClientId(), []);
}

export function useHostRoom(code: string | undefined, projectId = "cherwood") {
  const clientId = useClientIdStable();
  const engineRef = useRef<TurnEngine | null>(null);
  const p2pRef = useRef<P2PRoom | null>(null);
  const peerMapRef = useRef<Map<string, string>>(new Map());
  const [room, setRoom] = useState<TurnSnapshot | null>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [error] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const pushAll = useCallback(() => {
    const engine = engineRef.current;
    const p2p = p2pRef.current;
    if (!engine) return;
    setRoom(engine.snapshotFor(clientId));
    if (!p2p) return;
    for (const peer of p2p.peerList()) {
      if (peer.connectionState !== "connected") continue;
      const guestId = peerMapRef.current.get(peer.id) ?? peer.id;
      const msg: HostToGuest = {
        t: "snapshot",
        room: engine.snapshotFor(guestId),
      };
      p2p.send(msg, peer.id);
    }
  }, [clientId]);

  useEffect(() => {
    if (!code || clientId === "ssr") return;
    const upper = code.toUpperCase();
    const engine = new TurnEngine(upper, clientId, projectId);
    engineRef.current = engine;
    setRoom(engine.snapshotFor(clientId));
    const unsub = engine.subscribe(() => pushAll());

    const p2p = new P2PRoom({
      room: upper,
      selfId: clientId,
      name: "host",
      onPeersChanged: setPeers,
      onConnected: () => setReady(true),
      onMessage: (from, data) => {
        const msg = parseGuestMessage(data);
        if (!msg) return;
        handleGuest(from, msg);
      },
    });
    p2pRef.current = p2p;
    void p2p.join();

    function handleGuest(peerId: string, msg: GuestToHost) {
      const eng = engineRef.current;
      if (!eng) return;

      if (msg.t === "hello") {
        peerMapRef.current.set(peerId, msg.clientId);
        eng.ensureSeat(msg.clientId, msg.displayName ?? "Игрок");
        p2pRef.current?.send(
          { t: "snapshot", room: eng.snapshotFor(msg.clientId) },
          peerId,
        );
        return;
      }

      const client =
        "clientId" in msg ? msg.clientId : peerMapRef.current.get(peerId);
      if (!client) return;
      peerMapRef.current.set(peerId, client);

      let result: HostToGuest | null = null;
      switch (msg.t) {
        case "claim": {
          const r = eng.claim(client, msg.characterId);
          result = { t: "actionResult", ok: r.ok, error: r.error };
          break;
        }
        case "start": {
          const r = eng.start(client);
          result = { t: "actionResult", ok: r.ok, error: r.error };
          break;
        }
        case "intent": {
          const r = eng.submitIntent(client, msg.intent);
          result = { t: "actionResult", ok: r.ok, error: r.error };
          break;
        }
        case "clearIntent": {
          eng.clearIntent(client);
          result = { t: "actionResult", ok: true };
          break;
        }
        default:
          break;
      }
      if (result) p2pRef.current?.send(result, peerId);
      pushAll();
    }

    return () => {
      unsub();
      p2p.close();
      p2pRef.current = null;
      engineRef.current = null;
    };
  }, [code, clientId, projectId, pushAll]);

  const claim = useCallback(
    (characterId: string | null) => {
      const r = engineRef.current?.claim(clientId, characterId) ?? {
        ok: false as const,
        error: "Нет стола",
      };
      pushAll();
      return r;
    },
    [clientId, pushAll],
  );

  const start = useCallback(() => {
    const r = engineRef.current?.start(clientId) ?? {
      ok: false as const,
      error: "Нет стола",
    };
    pushAll();
    return r;
  }, [clientId, pushAll]);

  const submitIntent = useCallback(
    (intent: ActionIntent) => {
      const r = engineRef.current?.submitIntent(clientId, intent) ?? {
        ok: false as const,
        error: "Нет стола",
      };
      pushAll();
      return r;
    },
    [clientId, pushAll],
  );

  const clearIntent = useCallback(() => {
    engineRef.current?.clearIntent(clientId);
    pushAll();
    return { ok: true as const };
  }, [clientId, pushAll]);

  return {
    clientId,
    room,
    peers,
    error,
    isLoading: !room && !error,
    ready,
    claim,
    start,
    submitIntent,
    clearIntent,
  };
}

export function useGuestRoom(code: string | undefined) {
  const clientId = useClientIdStable();
  const p2pRef = useRef<P2PRoom | null>(null);
  const hostPeerRef = useRef<string | null>(null);
  const [room, setRoom] = useState<TurnSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastActionError, setLastActionError] = useState<string | null>(null);

  const send = useCallback((msg: GuestToHost) => {
    const p2p = p2pRef.current;
    const host = hostPeerRef.current;
    if (!p2p) return;
    if (host) p2p.send(msg, host);
    else p2p.send(msg);
  }, []);

  useEffect(() => {
    if (!code || clientId === "ssr") return;
    const upper = code.toUpperCase();
    let cancelled = false;

    const p2p = new P2PRoom({
      room: upper,
      selfId: clientId,
      name: "guest",
      onPeersChanged: (list) => {
        const connected = list.find((p) => p.connectionState === "connected");
        if (connected) hostPeerRef.current = connected.id;
        else if (list[0]) hostPeerRef.current = list[0].id;
      },
      onConnected: () => {
        send({ t: "hello", clientId, displayName: "Игрок" });
      },
      onMessage: (from, data) => {
        hostPeerRef.current = from;
        const msg = parseHostMessage(data);
        if (!msg) return;
        if (msg.t === "snapshot") {
          setRoom(msg.room);
          setError(null);
        } else if (msg.t === "actionResult") {
          setLastActionError(msg.ok ? null : (msg.error ?? "Ошибка"));
        } else if (msg.t === "hostGone") {
          setError("Хост закрыл стол");
        }
      },
    });
    p2pRef.current = p2p;
    void p2p.join().then(() => {
      if (cancelled) return;
      setTimeout(() => {
        if (!cancelled) send({ t: "hello", clientId, displayName: "Игрок" });
      }, 800);
    });

    const hangTimer = setTimeout(() => {
      if (!cancelled) {
        setError((e) => e ?? "Ждём хоста… Откройте стол на ПК с тем же кодом.");
      }
    }, 12_000);

    return () => {
      cancelled = true;
      clearTimeout(hangTimer);
      p2p.close();
      p2pRef.current = null;
    };
  }, [code, clientId, send]);

  const claim = useCallback(
    (characterId: string | null) => {
      send({ t: "claim", clientId, characterId });
      return { ok: true as const };
    },
    [clientId, send],
  );

  const submitIntent = useCallback(
    (intent: ActionIntent) => {
      send({ t: "intent", clientId, intent });
      return { ok: true as const };
    },
    [clientId, send],
  );

  const clearIntent = useCallback(() => {
    send({ t: "clearIntent", clientId });
    return { ok: true as const };
  }, [clientId, send]);

  return {
    clientId,
    room,
    error,
    isLoading: !room && !error,
    lastActionError,
    claim,
    submitIntent,
    clearIntent,
  };
}

export function createLocalTableCode() {
  return makeRoomCode();
}
