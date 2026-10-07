import type { Game, Player } from "./types";

export interface PlayerStats {
  player: Player;
  played: number;
  wins: number;
  best: number;
  winStreak: number;
  bestWinStreak: number;
}

/** Derived stats from finished games. Add new stats here. */
export function computeStats(players: Player[], games: Game[]): PlayerStats[] {
  const finished = games
    .filter((g) => g.status === "finished" && g.finalTotals)
    .sort((a, b) => a.updatedAt - b.updatedAt);

  return players.map((player) => {
    const mine = finished.filter((g) => g.playerIds.includes(player.id));
    let streak = 0;
    let bestStreak = 0;
    let wins = 0;
    let best = 0;
    for (const g of mine) {
      const won = g.winnerIds?.includes(player.id) ?? false;
      if (won) wins++;
      streak = won ? streak + 1 : 0;
      bestStreak = Math.max(bestStreak, streak);
      best = Math.max(best, g.finalTotals?.[player.id] ?? 0);
    }
    return { player, played: mine.length, wins, best, winStreak: streak, bestWinStreak: bestStreak };
  });
}
