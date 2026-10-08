import { getLayout } from "./layouts";
import { isGameComplete } from "./logic";
import { getStrategy } from "./strategies";
import type { Game } from "./types";

/** Derive finished state, totals and winners from the sheets. Runs on client and server. */
export function finalizeGame(g: Game): Game {
  const layout = getLayout(g.layoutId);
  if (isGameComplete(layout, g)) {
    const totals = getStrategy(g.strategyId).compute(layout, g);
    const max = Math.max(...Object.values(totals));
    return { ...g, status: "finished", finalTotals: totals, winnerIds: Object.keys(totals).filter((k) => totals[k] === max) };
  }
  return { ...g, status: g.status === "finished" ? "active" : g.status, finalTotals: undefined, winnerIds: undefined };
}

export const isGuestId = (id: string) => id.startsWith("g_");
