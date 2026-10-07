import { useState } from "react";
import { LAYOUTS } from "../layouts";
import { actions } from "../store";
import { STRATEGIES } from "../strategies";
import type { Player, Settings } from "../types";

const field = "w-full rounded-xl bg-panel px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-primary/50";

export function NewGameForm({ players, settings }: { players: Player[]; settings: Settings }) {
  const [name, setName] = useState("");
  const [layoutId, setLayoutId] = useState(settings.defaultLayoutId);
  const [strategyId, setStrategyId] = useState(settings.defaultStrategyId);
  const [rounds, setRounds] = useState(settings.defaultRounds);
  const [picked, setPicked] = useState<string[]>([]);
  const [guest, setGuest] = useState("");

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="glass-card p-8">
      <h2 className="font-display text-2xl italic">Set the table</h2>
      <p className="mt-1 text-xs text-muted-foreground">Pick a board, players and how many boards to play.</p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="eyebrow">Game name</span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Friday table" />
        </label>
        <label className="space-y-1.5">
          <span className="eyebrow">Boards (turns)</span>
          <input
            type="number"
            min={1}
            max={10}
            className={field}
            value={rounds}
            onChange={(e) => setRounds(Math.max(1, Math.min(10, +e.target.value || 1)))}
          />
        </label>
        <div className="space-y-1.5 md:col-span-2">
          <span className="eyebrow">Board layout</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLayoutId(l.id)}
                className={`rounded-2xl p-3 text-left ring-1 transition-colors ${
                  layoutId === l.id ? "bg-primary/10 ring-primary/30" : "bg-panel/60 ring-border hover:bg-panel"
                }`}
              >
                <div className={`font-display italic ${layoutId === l.id ? "text-primary" : ""}`}>{l.name}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{l.description}</div>
              </button>
            ))}
          </div>
        </div>
        <label className="space-y-1.5 md:col-span-2">
          <span className="eyebrow">Scoring</span>
          <select className={field} value={strategyId} onChange={(e) => setStrategyId(e.target.value)}>
            {STRATEGIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.description}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-2 md:col-span-2">
          <span className="eyebrow">Players · seat order follows your picks</span>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => {
              const i = picked.indexOf(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`rounded-full px-3 py-1.5 text-xs ring-1 ${
                    i >= 0 ? "bg-primary text-primary-foreground ring-primary" : "bg-panel ring-border"
                  }`}
                >
                  {i >= 0 && <span className="mr-1 font-mono">{i + 1}</span>}
                  {p.name}
                </button>
              );
            })}
            <form
              className="flex"
              onSubmit={(e) => {
                e.preventDefault();
                if (!guest.trim()) return;
                const id = actions.addPlayer(guest);
                if (id) setPicked((p) => [...p, id]);
                setGuest("");
              }}
            >
              <input
                className="w-32 rounded-full bg-panel px-3 py-1.5 text-xs ring-1 ring-border outline-none"
                placeholder="+ new player"
                value={guest}
                onChange={(e) => setGuest(e.target.value)}
              />
            </form>
          </div>
        </div>
      </div>

      <button
        disabled={picked.length === 0}
        onClick={() =>
          actions.createGame({
            name: name.trim() || `Game · ${new Date().toLocaleDateString()}`,
            layoutId,
            strategyId,
            rounds,
            playerIds: picked,
          })
        }
        className="mt-8 rounded-full bg-primary px-6 py-2.5 text-sm text-primary-foreground transition-opacity disabled:opacity-40"
      >
        Start game
      </button>
      {picked.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {players.length === 0
            ? "Type a name in “+ new player” and press Enter to add someone."
            : "Tap at least one player above to seat them at the table."}
        </p>
      )}
    </div>
  );
}
