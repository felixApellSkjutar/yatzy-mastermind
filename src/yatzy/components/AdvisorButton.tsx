import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAdvice } from "@/lib/api.functions";
import type { Advice } from "../advisor";
import { getLayout } from "../layouts";
import { currentPlayerId, currentRoundIndex, sectionSum } from "../logic";
import { actions } from "../store";
import type { Game, Player } from "../types";

const PIPS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export function AdvisorButton({ game, players }: { game: Game; players: Player[] }) {
  const layout = getLayout(game.layoutId);
  const turn = currentPlayerId(layout, game);
  const [open, setOpen] = useState(false);
  const [dice, setDice] = useState<number[]>(() => Array(layout.diceCount).fill(1));
  const [rolls, setRolls] = useState(2);
  const [res, setRes] = useState<{ rolls: number; list: Advice[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const fetchAdvice = useServerFn(getAdvice);
  if (game.status === "finished" || !turn) return null;

  const round = currentRoundIndex(layout, game);
  const sheet = game.sheets[round]!;
  const openIds = layout.categories.filter((c) => sheet[turn]?.[c.id] == null).map((c) => c.id);
  const name = players.find((p) => p.id === turn)?.name ?? "Player";

  const toggle = () => {
    if (!open) {
      setRolls(2);
      setRes(null);
      setDice(Array(layout.diceCount).fill(1));
    }
    setOpen(!open);
  };

  const run = async () => {
    setBusy(true);
    try {
      const list = await fetchAdvice({
        data: { layoutId: layout.id, dice, rollsLeft: rolls, open: openIds, upperSoFar: sectionSum(layout, sheet, turn, "upper") },
      });
      setRes({ rolls, list });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not get advice");
    } finally {
      setBusy(false);
    }
  };

  const kept = (a: Advice) => {
    const left = [...a.keep];
    return dice.map((d) => {
      const i = left.indexOf(d);
      if (i === -1) return false;
      left.splice(i, 1);
      return true;
    });
  };

  return (
    <>
      <button
        onClick={toggle}
        aria-label="Move advisor"
        className="glass-pill fixed bottom-6 left-6 z-30 flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-lg"
      >
        ⚄
      </button>
      {open && (
        <div className="glass-card fixed bottom-24 left-6 z-30 w-[min(92vw,380px)] p-5 shadow-xl">
          <p className="eyebrow">Move advisor · {name}</p>
          <div className="mt-3 flex gap-2">
            {dice.map((d, i) => (
              <button
                key={i}
                aria-label={`Die ${i + 1}: ${d}`}
                onClick={() => setDice(dice.map((x, j) => (j === i ? (x % 6) + 1 : x)))}
                className="h-12 w-12 rounded-xl bg-card text-4xl leading-none ring-1 ring-border"
              >
                {PIPS[d]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Tap a die to change its face.</p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Throws left</span>
            {[2, 1, 0].map((n) => (
              <button
                key={n}
                onClick={() => setRolls(n)}
                className={`rounded-full px-3 py-1 font-mono text-xs ring-1 ring-border ${rolls === n ? "bg-primary text-primary-foreground" : "bg-card"}`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={run}
              disabled={busy}
              className="ml-auto rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              {busy ? "…" : "Advise"}
            </button>
          </div>
          {res && (
            <ol className="mt-4 space-y-2">
              {res.list.length === 0 && <li className="text-sm text-muted-foreground">No open boxes left.</li>}
              {res.list.map((a, i) => (
                <li key={i} className="rounded-xl bg-card/70 p-3 ring-1 ring-border">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{i + 1}. {a.targetLabel}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {res.rolls > 0 ? `${Math.round(a.probability * 100)}% · ≈ ${a.expected} pts` : `${a.expected} pts`}
                    </span>
                  </div>
                  {res.rolls > 0 ? (
                    <div className="mt-1 flex items-center gap-1">
                      {kept(a).map((k, j) => (
                        <span key={j} className={`text-2xl leading-none ${k ? "text-primary" : "opacity-25"}`}>
                          {PIPS[dice[j]!]}
                        </span>
                      ))}
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        {a.keep.length === dice.length ? "keep all, score now" : a.keep.length ? "keep highlighted, reroll rest" : "reroll all"}
                      </span>
                    </div>
                  ) : (
                    actions.canEdit(game) && (
                      <button
                        onClick={() => {
                          if (confirm(`Score ${a.expected} in ${a.targetLabel} for ${name}?`)) {
                            actions.setCell(game.id, round, turn, a.target, a.expected);
                            setOpen(false);
                          }
                        }}
                        className="mt-1 text-xs text-primary underline"
                      >
                        Use this
                      </button>
                    )
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </>
  );
}
