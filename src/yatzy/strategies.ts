import { isRoundComplete, roundTotal } from "./logic";
import type { BoardLayout, Game } from "./types";

/** A scoring strategy turns a game's boards into one final score per player. */
export interface ScoringStrategy {
  id: string;
  name: string;
  description: string;
  compute: (layout: BoardLayout, game: Game) => Record<string, number>;
}

const perPlayer = (game: Game, fn: (pid: string) => number) =>
  Object.fromEntries(game.playerIds.map((pid) => [pid, fn(pid)]));

export const STRATEGIES: ScoringStrategy[] = [
  {
    id: "sum",
    name: "Sum of all boards",
    description: "Every point on every board counts.",
    compute: (layout, game) =>
      perPlayer(game, (pid) => game.sheets.reduce((a, s) => a + roundTotal(layout, s, pid), 0)),
  },
  {
    id: "best",
    name: "Best single board",
    description: "Only your highest board counts.",
    compute: (layout, game) =>
      perPlayer(game, (pid) => Math.max(0, ...game.sheets.map((s) => roundTotal(layout, s, pid)))),
  },
  {
    id: "wins",
    name: "Board wins",
    description: "1 point per finished board you win (ties share).",
    compute: (layout, game) => {
      const res = perPlayer(game, () => 0);
      game.sheets
        .filter((s) => isRoundComplete(layout, s, game.playerIds))
        .forEach((s) => {
          const totals = game.playerIds.map((pid) => roundTotal(layout, s, pid));
          const max = Math.max(...totals);
          game.playerIds.forEach((pid, i) => totals[i] === max && (res[pid] += 1));
        });
      return res;
    },
  },
];

export const getStrategy = (id: string) => STRATEGIES.find((s) => s.id === id) ?? STRATEGIES[0];
