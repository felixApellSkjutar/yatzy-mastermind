import { useMemo, useState } from "react";
import { getLayout } from "../layouts";
import { currentPlayerId, currentRoundIndex } from "../logic";
import { actions } from "../store";
import { computeStats } from "../stats";
import type { AppState } from "../types";

const Card = ({ title, children, delay }: { title: string; children: React.ReactNode; delay: number }) => (
  <div className="glass-card animate-rise p-5" style={{ animationDelay: `${delay}ms` }}>
    <div className="eyebrow mb-3">{title}</div>
    {children}
  </div>
);

function PlayersCard({ state }: { state: AppState }) {
  const game = state.games.find((g) => g.id === state.activeGameId);
  const turn = game ? currentPlayerId(getLayout(game.layoutId), game) : null;
  const list = game ? game.playerIds.map((id) => state.players.find((p) => p.id === id)!).filter(Boolean) : state.players.filter((p) => !p.guest);

  return (
    <Card title={`${game ? "At the table" : "Players"} · ${list.length}`} delay={280}>
      <div className="space-y-1">
        {list.map((p) => {
          const on = p.id === turn;
          return (
            <div key={p.id} className={`group flex items-center gap-3 rounded-xl px-2 py-2 ${on ? "bg-primary/10 ring-1 ring-primary/25" : ""}`}>
              <div
                className={`grid size-8 place-items-center rounded-full font-display text-sm italic ${
                  on ? "bg-primary text-primary-foreground" : "bg-ink/10"
                }`}
              >
                {p.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 leading-tight">
                <div>{p.name}</div>
                {game && <div className={`font-mono text-[10px] ${on ? "text-primary" : "text-muted-foreground"}`}>{on ? "on turn" : "waiting"}</div>}
              </div>
              {p.id === state.me?.id && <span className="font-mono text-[10px] text-muted-foreground">you</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SavedGamesCard({ state }: { state: AppState }) {
  const games = state.games.filter((g) => g.id !== state.activeGameId).slice(0, 8);
  return (
    <Card title="Saved games" delay={360}>
      {games.length === 0 && <p className="text-xs text-muted-foreground">Paused and finished games show up here.</p>}
      {games.map((g, i) => {
        const layout = getLayout(g.layoutId);
        return (
          <div key={g.id} className={`group flex items-center gap-2 py-2 ${i < games.length - 1 ? "border-b" : ""}`}>
            <button onClick={() => actions.openGame(g.id)} className="flex-1 text-left">
              <div>
                {g.name} · {g.playerIds.length}P
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                {g.status} · board {currentRoundIndex(layout, g) + 1}/{g.rounds}
              </div>
            </button>
            {actions.canEdit(g) && <button
              onClick={() => actions.deleteGame(g.id)}
              className="text-[11px] text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
            >
              Delete
            </button>}
          </div>
        );
      })}
    </Card>
  );
}

function HighscoresCard({ state }: { state: AppState }) {
  const stats = useMemo(() => computeStats(state.players.filter((p) => !p.guest), state.statsGames), [state.players, state.statsGames]);
  const ranked = [...stats].filter((s) => s.played > 0).sort((a, b) => b.best - a.best);
  const topStreak = [...stats].sort((a, b) => b.winStreak - a.winStreak)[0];
  return (
    <Card title="Highscores & streaks" delay={440}>
      {ranked.length === 0 && <p className="text-xs text-muted-foreground">Finish a game to start the records.</p>}
      {ranked.slice(0, 5).map((s, i) => (
        <div key={s.player.id} className="flex items-baseline justify-between border-b py-1.5 last:border-0">
          <span>
            <span className="mr-2 font-mono text-[10px] text-muted-foreground">{i + 1}</span>
            {s.player.name}
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">
              {s.wins}/{s.played} won
            </span>
          </span>
          <span className="font-mono text-primary">{s.best}</span>
        </div>
      ))}
      {topStreak && topStreak.winStreak > 0 && (
        <div className="mt-2 flex items-baseline justify-between pt-1.5">
          <span>Win streak · {topStreak.player.name}</span>
          <span className="font-mono text-accent">{topStreak.winStreak}</span>
        </div>
      )}
    </Card>
  );
}

/** Right-hand menu. Add/reorder cards here. */
export function SideMenu({ state }: { state: AppState }) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[300px]">
      <PlayersCard state={state} />
      <SavedGamesCard state={state} />
      <HighscoresCard state={state} />
    </aside>
  );
}
