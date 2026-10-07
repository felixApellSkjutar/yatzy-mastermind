import { Fragment, useEffect, useState } from "react";
import { getLayout } from "../layouts";
import { bonusValue, currentPlayerId, currentRoundIndex, filledCount, roundTotal } from "../logic";
import { actions } from "../store";
import { getStrategy } from "../strategies";
import type { Game, Player, Settings } from "../types";
import { HiddenScore } from "./HiddenScore";
import { ScoreEntryMenu } from "./ScoreEntryMenu";

interface Props {
  game: Game;
  players: Player[];
  settings: Settings;
}

export function Board({ game, players, settings }: Props) {
  const layout = getLayout(game.layoutId);
  const strategy = getStrategy(game.strategyId);
  const liveRound = currentRoundIndex(layout, game);
  const [round, setRound] = useState(liveRound);
  const [open, setOpen] = useState<{ pid: string; cid: string } | null>(null);
  useEffect(() => setRound(liveRound), [liveRound, game.id]);

  const sheet = game.sheets[round];
  const turn = currentPlayerId(layout, game);
  const finished = game.status === "finished";
  const hide = settings.blurTotals && !finished;
  const totals = strategy.compute(layout, game);
  const nameOf = (pid: string) => players.find((p) => p.id === pid)?.name ?? "Unknown";
  const cols = `minmax(140px,1.2fr) repeat(${game.playerIds.length}, minmax(64px,1fr))`;

  return (
    <div className="glass-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl italic">{game.name}</h2>
          <p className="font-mono text-[10px] text-muted-foreground">
            {layout.name} · {strategy.name}
          </p>
        </div>
        {game.rounds > 1 && (
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {game.sheets.map((_, i) => (
              <button
                key={i}
                onClick={() => setRound(i)}
                className={`rounded-full px-3 py-1 font-mono text-[11px] ${
                  i === round ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
              >
                Board {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {finished && (
        <div className="mb-5 rounded-2xl bg-primary/10 px-4 py-3 text-sm ring-1 ring-primary/25">
          <span className="font-display italic text-primary">Game over</span> — winner
          {game.winnerIds && game.winnerIds.length > 1 ? "s" : ""}:{" "}
          <strong>{game.winnerIds?.map(nameOf).join(", ")}</strong>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="grid min-w-fit gap-2.5 text-xs" style={{ gridTemplateColumns: cols }}>
          <div className="eyebrow px-2 pb-2 text-[11px]">Category</div>
          {game.playerIds.map((pid) => (
            <div key={pid} className="pb-2 text-center">
              <div className={`font-display text-lg italic ${pid === turn ? "text-primary" : ""}`}>{nameOf(pid)}</div>
              <div className={`font-mono text-[10px] ${pid === turn ? "text-primary" : "text-muted-foreground"}`}>
                {pid === turn ? "on turn" : `${filledCount(layout, sheet, pid)}/${layout.categories.length}`}
              </div>
            </div>
          ))}

          {layout.sections.map((section) => (
            <Fragment key={section.id}>
              <div
                className="eyebrow border-t pb-1 pt-3"
                style={{ gridColumn: `1 / span ${game.playerIds.length + 1}` }}
              >
                {section.label}
              </div>
              {layout.categories
                .filter((c) => c.sectionId === section.id)
                .map((cat) => (
                  <Fragment key={cat.id}>
                    <div className="px-2 py-2">{cat.label}</div>
                    {game.playerIds.map((pid) => {
                      const v = sheet[pid]?.[cat.id] ?? null;
                      const isTurn = pid === turn && round === liveRound;
                      const isOpen = open?.pid === pid && open.cid === cat.id;
                      return (
                        <div key={pid} className="relative">
                          <button
                            onClick={() => setOpen(isOpen ? null : { pid, cid: cat.id })}
                            className={`w-full rounded-xl py-2 text-center font-mono ring-1 transition-colors ${
                              isOpen
                                ? "animate-turn bg-accent/15 text-accent-foreground ring-accent/40"
                                : v != null
                                  ? "bg-primary/10 text-primary ring-primary/25"
                                  : isTurn
                                    ? "bg-accent/5 text-muted-foreground ring-accent/30 hover:bg-accent/10"
                                    : "text-muted-foreground ring-border hover:bg-glass/60"
                            }`}
                          >
                            {v ?? "—"}
                          </button>
                          {isOpen && (
                            <ScoreEntryMenu
                              layout={layout}
                              category={cat}
                              current={v}
                              enabledHelpers={settings.enabledHelpers}
                              onClose={() => setOpen(null)}
                              onPick={(val) => {
                                actions.setCell(game.id, round, pid, cat.id, val);
                                setOpen(null);
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              {layout.bonuses
                .filter((b) => b.sectionId === section.id)
                .map((b) => (
                  <Fragment key={b.id}>
                    <div className="px-2 py-2 font-display italic">
                      {b.label} <span className="font-mono text-[10px] text-muted-foreground">≥{b.threshold}</span>
                    </div>
                    {game.playerIds.map((pid) => (
                      <div key={pid} className="rounded-xl bg-panel/70 py-2 text-center font-mono text-muted-foreground ring-1 ring-border">
                        {bonusValue(layout, sheet, pid, b.id) ? `+${b.value}` : "—"}
                      </div>
                    ))}
                  </Fragment>
                ))}
            </Fragment>
          ))}

          <div className="border-t px-2 pt-4 font-display italic">Board total</div>
          {game.playerIds.map((pid) => (
            <div key={pid} className="border-t pt-2">
              <div className="rounded-xl bg-panel/60 py-2 text-center ring-1 ring-border">
                <HiddenScore value={roundTotal(layout, sheet, pid)} hidden={hide} revealSeconds={settings.revealSeconds} />
              </div>
            </div>
          ))}
          <div className="px-2 py-2 font-display font-medium italic">Final score</div>
          {game.playerIds.map((pid) => (
            <div
              key={pid}
              className={`rounded-xl py-2 text-center text-sm ring-1 ${
                finished && game.winnerIds?.includes(pid) ? "bg-primary text-primary-foreground ring-primary" : "bg-panel ring-border"
              }`}
            >
              <HiddenScore value={totals[pid] ?? 0} hidden={hide} revealSeconds={settings.revealSeconds} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
