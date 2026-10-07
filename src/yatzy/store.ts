import { useSyncExternalStore } from "react";
import { getLayout } from "./layouts";
import { emptySheet, isGameComplete } from "./logic";
import { getStrategy } from "./strategies";
import type { AppState, CellValue, Game, Settings } from "./types";

const KEY = "yatzy-tray:v1";

export const DEFAULT_SETTINGS: Settings = {
  defaultLayoutId: "scandinavian",
  defaultStrategyId: "sum",
  defaultRounds: 1,
  revealSeconds: 3,
  enabledHelpers: ["quick", "dice", "numpad"],
  blurTotals: true,
};

const INITIAL: AppState = { players: [], games: [], activeGameId: null, settings: DEFAULT_SETTINGS };

let state: AppState = INITIAL;
const listeners = new Set<() => void>();

function set(fn: (s: AppState) => AppState) {
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

/** Call once on the client to load saved data. */
export function hydrateStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AppState>;
      state = { ...INITIAL, ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings } };
      listeners.forEach((l) => l());
    }
  } catch {
    /* ignore corrupt data */
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useAppState = () => useSyncExternalStore(subscribe, () => state, () => INITIAL);

const uid = () => crypto.randomUUID();
const patchGame = (id: string, fn: (g: Game) => Game) =>
  set((s) => ({ ...s, games: s.games.map((g) => (g.id === id ? { ...fn(g), updatedAt: Date.now() } : g)) }));

/* ---------------- actions ---------------- */
export const actions = {
  addPlayer(name: string): string | undefined {
    const n = name.trim();
    if (!n) return;
    const id = uid();
    set((s) => ({ ...s, players: [...s.players, { id, name: n, createdAt: Date.now() }] }));
    return id;
  },
  removePlayer(id: string) {
    set((s) => ({ ...s, players: s.players.filter((p) => p.id !== id) }));
  },

  createGame(opts: { name: string; layoutId: string; strategyId: string; rounds: number; playerIds: string[] }) {
    const layout = getLayout(opts.layoutId);
    const game: Game = {
      id: uid(),
      ...opts,
      sheets: Array.from({ length: opts.rounds }, () => emptySheet(layout, opts.playerIds)),
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((s) => ({
      ...s,
      games: [game, ...s.games.map((g) => (g.status === "active" ? { ...g, status: "paused" as const } : g))],
      activeGameId: game.id,
    }));
  },

  setCell(gameId: string, round: number, playerId: string, categoryId: string, value: CellValue) {
    patchGame(gameId, (g) => {
      const sheets = g.sheets.map((sh, i) =>
        i === round ? { ...sh, [playerId]: { ...sh[playerId], [categoryId]: value } } : sh,
      );
      const next = { ...g, sheets };
      const layout = getLayout(g.layoutId);
      if (isGameComplete(layout, next)) {
        const totals = getStrategy(g.strategyId).compute(layout, next);
        const max = Math.max(...Object.values(totals));
        return {
          ...next,
          status: "finished",
          finalTotals: totals,
          winnerIds: Object.keys(totals).filter((k) => totals[k] === max),
        };
      }
      return { ...next, status: "active", finalTotals: undefined, winnerIds: undefined };
    });
  },

  pauseGame(id: string) {
    patchGame(id, (g) => (g.status === "active" ? { ...g, status: "paused" } : g));
    set((s) => ({ ...s, activeGameId: s.activeGameId === id ? null : s.activeGameId }));
  },
  openGame(id: string) {
    set((s) => ({
      ...s,
      activeGameId: id,
      games: s.games.map((g) =>
        g.id === id && g.status === "paused"
          ? { ...g, status: "active" }
          : g.id !== id && g.status === "active"
            ? { ...g, status: "paused" }
            : g,
      ),
    }));
  },
  closeGame() {
    const id = state.activeGameId;
    if (id) actions.pauseGame(id);
  },
  deleteGame(id: string) {
    set((s) => ({
      ...s,
      games: s.games.filter((g) => g.id !== id),
      activeGameId: s.activeGameId === id ? null : s.activeGameId,
    }));
  },

  updateSettings(patch: Partial<Settings>) {
    set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },
};
