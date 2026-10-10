import { createFileRoute, Link } from "@tanstack/react-router";
import { PhonePlay } from "@/components/phone-play";
import { useGuestRoom } from "@/lib/game/use-p2p-room";
import { useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
  p: z.string().optional(),
});

export const Route = createFileRoute("/play/$code")({
  validateSearch: (s) => searchSchema.parse(s),
  component: PlayPage,
});

function PlayPage() {
  const { code } = Route.useParams();
  const guest = useGuestRoom(code);
  const { room, clientId, error } = guest;
  const [claimError, setClaimError] = useState<string | null>(null);

  if (error && !room) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <p className="font-display text-3xl text-paper">Стол</p>
        <p className="text-sm text-muted">{error}</p>
        <p className="max-w-sm text-xs text-faint">
          Код {code.toUpperCase()}. Нужен открытый хаб на ПК.
        </p>
        <Link to="/" className="text-sm underline">
          К проектам
        </Link>
      </main>
    );
  }
  if (!room) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-bg px-6 text-center">
        <p className="font-display text-2xl text-paper">Садимся за стол…</p>
        <p className="text-xs text-faint">{code.toUpperCase()}</p>
      </main>
    );
  }

  return (
    <PhonePlay
      room={room}
      clientId={clientId}
      onClaim={(id) => {
        guest.claim(id);
        setClaimError(null);
      }}
      onIntent={(intent) => guest.submitIntent(intent)}
      onClearIntent={() => guest.clearIntent()}
      claimError={claimError}
      actionError={guest.lastActionError}
    />
  );
}
