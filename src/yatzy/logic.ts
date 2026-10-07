import type { BoardLayout, Game, RoundSheet } from "./types";

export const emptySheet = (layout: BoardLayout, playerIds: string[]): RoundSheet =>
  Object.fromEntries(
    playerIds.map((pid) => [pid, Object.fromEntries(layout.categories.map((c) => [c.id, null]))]),
  );

export const filledCount = (layout: BoardLayout, sheet: RoundSheet, pid: string) =>
  layout.categories.filter((c) => sheet[pid]?.[c.id] != null).length;

export const isRoundComplete = (layout: BoardLayout, sheet: RoundSheet, playerIds: string[]) =>
  playerIds.every((pid) => filledCount(layout, sheet, pid) === layout.categories.length);

/** First round that isn't fully filled (or the last one). */
export const currentRoundIndex = (layout: BoardLayout, game: Game) => {
  const i = game.sheets.findIndex((s) => !isRoundComplete(layout, s, game.playerIds));
  return i === -1 ? game.sheets.length - 1 : i;
};

export const isGameComplete = (layout: BoardLayout, game: Game) =>
  game.sheets.every((s) => isRoundComplete(layout, s, game.playerIds));

/** Next in turn = the player with fewest filled cells in the current round (seat order breaks ties). */
export const currentPlayerId = (layout: BoardLayout, game: Game): string | null => {
  if (isGameComplete(layout, game)) return null;
  const sheet = game.sheets[currentRoundIndex(layout, game)]!;
  let best: string | null = null;
  let min = Infinity;
  for (const pid of game.playerIds) {
    const n = filledCount(layout, sheet, pid);
    if (n < min) {
      min = n;
      best = pid;
    }
  }
  return best;
};

export const sectionSum = (layout: BoardLayout, sheet: RoundSheet, pid: string, sectionId: string) =>
  layout.categories
    .filter((c) => c.sectionId === sectionId)
    .reduce((a, c) => a + (sheet[pid]?.[c.id] ?? 0), 0);

export const bonusValue = (layout: BoardLayout, sheet: RoundSheet, pid: string, bonusId: string) => {
  const b = layout.bonuses.find((x) => x.id === bonusId);
  if (!b) return 0;
  return sectionSum(layout, sheet, pid, b.sectionId) >= b.threshold ? b.value : 0;
};

/** Points for a single board (round), including bonuses. */
export const roundTotal = (layout: BoardLayout, sheet: RoundSheet, pid: string) =>
  layout.categories.reduce((a, c) => a + (sheet[pid]?.[c.id] ?? 0), 0) +
  layout.bonuses.reduce((a, b) => a + bonusValue(layout, sheet, pid, b.id), 0);
