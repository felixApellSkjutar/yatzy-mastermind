import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LEGACY_KEY, actions } from "../store";
import type { Game, Player } from "../types";

/** One-time offer to upload games saved in this browser before accounts existed. */
export function ImportLegacy({ meId }: { meId: string }) {
  const flag = `yatzy-tray:imported:${meId}`;
  const [data, setData] = useState<{ games: Game[]; players: Player[] } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(flag)) return;
      const raw = localStorage.getItem(LEGACY_KEY);
      const parsed = raw ? (JSON.parse(raw) as { games?: Game[]; players?: Player[] }) : null;
      if (parsed?.games?.length) setData({ games: parsed.games, players: parsed.players ?? [] });
    } catch {
      /* ignore */
    }
  }, [flag]);

  if (!data) return null;
  const done = () => {
    localStorage.setItem(flag, "1");
    setData(null);
  };

  return (
    <div className="glass-card mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <div className="font-display text-lg italic">Bring your old games along?</div>
        <p className="text-xs text-muted-foreground">
          This browser has {data.games.length} game{data.games.length === 1 ? "" : "s"} from before accounts. Names matching a
          registered player are linked to them; others become guests.
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={done} className="glass-pill px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
          Not now
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await actions.importLegacy(data.games, data.players);
              toast.success("Games imported");
              done();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Import failed");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground disabled:opacity-40"
        >
          {busy ? "Importing…" : "Import"}
        </button>
      </div>
    </div>
  );
}
