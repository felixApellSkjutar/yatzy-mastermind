import { useSyncExternalStore } from "react";
import * as api from "@/lib/api.functions";
import { getLayout } from "./layouts";
import { emptySheet } from "./logic";
import { finalizeGame } from "./finalize";
import type { AppState, CellValue, Game, Player, Settings } from "./types";

/** Pre-accounts browser data; read once for the import offer. */
export const LEGACY_KEY = "yatzy-tray:v1";
const ACTIVE_KEY = "yatzy-tray:active-game";

export const DEFAULT_SETTINGS: Settings = {
  defaultLayoutId: "scandinavian",
  defaultStrategyId: "sum",
  defaultRounds: 1,
  revealSeconds: 3,
  enabledHelpers: ["quick", "dice", "numpad"],
  blurTotals: true,
};

const INITIAL: AppState = {
  status: "loading",
  me: null,
  players: [],
  games: [],
  statsGames: [],
  activeGameId: null,
  settings: DEFAULT_SETTINGS,
};

let state: AppState = INITIAL;
const listeners = new Set<() => void>();

function set(fn: (s: AppState) => AppState) {
  state = withGuests(fn(state));
  try {
    if (state.activeGameId) localStorage.setItem(ACTIVE_KEY, state.activeGameId);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

/** Guests are derived from the games they sit in — never stored separately. */
function withGuests(s: AppState): AppState {
  const accounts = s.players.filter((p) => !p.guest);
  const guests: Player[] = [];
  for (const g of s.games)
    for (const [id, name] of Object.entries(g.guests ?? {})) guests.push({ id, name, createdAt: g.createdAt, guest: true });
  return { ...s, players: [...accounts, ...guests] };
}

const errorListeners = new Set<(msg: string) => void>();
export const onStoreError = (fn: (msg: string) => void) => {
  errorListeners.add(fn);
  return () => {
    errorListeners.delete(fn);
  };
};
const report = (e: unknown) => errorListeners.forEach((l) => l(e instanceof Error ? e.message : "Something went wrong"));

/** Load everything for the signed-in user from the server. */
export async function hydrateStore() {
  const me = await api.getMe();
  if (!me) {
    set(() => ({ ...INITIAL, status: "signedOut" }));
    return;
  }
  const data = await api.loadState();
  let active: string | null = null;
  try {
    active = localStorage.getItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
  set(() => ({
    ...INITIAL,
    status: "ready",
    me: data.me,
    players: data.players,
    games: data.games,
    statsGames: data.statsGames,
    activeGameId: data.games.some((g) => g.id === active && g.status !== "finished") ? active : null,
    settings: { ...DEFAULT_SETTINGS, ...data.me.settings },
  }));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useAppState = () => useSyncExternalStore(subscribe, () => state, () => INITIAL);

const uid = () => crypto.randomUUID();

/* ---------------- persistence ---------------- */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
function persistGame(id: string, delay = 400) {
  clearTimeout(timers.get(id));
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      const g = state.games.find((x) => x.id === id);
      if (!g) return;
      api
        .saveGame({ data: g })
        .then((saved) => {
          if (saved.status === "finished")
            set((s) => ({ ...s, statsGames: [...s.statsGames.filter((x) => x.id !== saved.id), saved] }));
        })
        .catch(report);
    }, delay),
  );
}

const patchGame = (id: string, fn: (g: Game) => Game, delay?: number) => {
  set((s) => ({ ...s, games: s.games.map((g) => (g.id === id ? { ...fn(g), updatedAt: Date.now() } : g)) }));
  persistGame(id, delay);
};

/* ---------------- actions ---------------- */
export const actions = {
  /** Creates a guest seat id. The name is attached to the game when it is created. */
  newGuestId: () => `g_${uid().slice(0, 8)}`,

  createGame(opts: {
    name: string;
    layoutId: string;
    strategyId: string;
    rounds: number;
    playerIds: string[];
    guests?: Record<string, string>;
  }) {
    const layout = getLayout(opts.layoutId);
    const game: Game = {
      id: uid(),
      ...opts,
      ownerId: state.me?.id,
      sheets: Array.from({ length: opts.rounds }, () => emptySheet(layout, opts.playerIds)),
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const paused = state.games.filter((g) => g.status === "active" && g.ownerId === state.me?.id).map((g) => g.id);
    set((s) => ({
      ...s,
      games: [game, ...s.games.map((g) => (paused.includes(g.id) ? { ...g, status: "paused" as const } : g))],
      activeGameId: game.id,
    }));
    persistGame(game.id, 0);
    paused.forEach((id) => persistGame(id, 0));
  },

  setCell(gameId: string, round: number, playerId: string, categoryId: string, value: CellValue) {
    patchGame(gameId, (g) => {
      const sheets = g.sheets.map((sh, i) =>
        i === round ? { ...sh, [playerId]: { ...sh[playerId], [categoryId]: value } } : sh,
      );
      return finalizeGame({ ...g, sheets, status: "active" });
    });
  },

  pauseGame(id: string) {
    const g = state.games.find((x) => x.id === id);
    if (g?.status === "active" && actions.canEdit(g)) patchGame(id, (x) => ({ ...x, status: "paused" }), 0);
    set((s) => ({ ...s, activeGameId: s.activeGameId === id ? null : s.activeGameId }));
  },
  openGame(id: string) {
    const g = state.games.find((x) => x.id === id);
    set((s) => ({ ...s, activeGameId: id }));
    if (g?.status === "paused" && actions.canEdit(g)) patchGame(id, (x) => ({ ...x, status: "active" }), 0);
  },
  closeGame() {
    const id = state.activeGameId;
    if (id) actions.pauseGame(id);
  },
  deleteGame(id: string) {
    set((s) => ({
      ...s,
      games: s.games.filter((g) => g.id !== id),
      statsGames: s.statsGames.filter((g) => g.id !== id),
      activeGameId: s.activeGameId === id ? null : s.activeGameId,
    }));
    api.deleteGame({ data: { id } }).catch(report);
  },

  /** Only the host (or an admin) can enter scores. */
  canEdit: (g: Game) => !!state.me && (g.ownerId === state.me.id || state.me.isAdmin),

  updateSettings(patch: Partial<Settings>) {
    set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    api.saveSettings({ data: { ...state.settings } }).catch(report);
  },

  async signOut() {
    await api.signOut();
    set(() => ({ ...INITIAL, status: "signedOut" }));
  },

  /** Upload games from the pre-accounts browser storage. Names matching an account are linked, others become guests. */
  async importLegacy(games: Game[], localPlayers: Player[]) {
    const byName = new Map(state.players.filter((p) => !p.guest).map((p) => [p.name.toLowerCase(), p.id]));
    for (const g of games) {
      const map: Record<string, string> = {};
      const guests: Record<string, string> = {};
      for (const pid of g.playerIds) {
        const name = localPlayers.find((p) => p.id === pid)?.name ?? "Guest";
        const account = byName.get(name.toLowerCase());
        const nid = account && !Object.values(map).includes(account) ? account : actions.newGuestId();
        map[pid] = nid;
        if (nid !== account) guests[nid] = name;
      }
      const remap = <T,>(rec: Record<string, T>) => Object.fromEntries(Object.entries(rec).map(([k, v]) => [map[k] ?? k, v]));
      const game: Game = {
        ...g,
        id: uid(),
        ownerId: state.me?.id,
        playerIds: g.playerIds.map((p) => map[p]!),
        guests,
        sheets: g.sheets.map((sh) => remap(sh)),
        status: g.status === "active" ? "paused" : g.status,
      };
      const saved = await api.saveGame({ data: game });
      set((s) => ({ ...s, games: [saved, ...s.games], statsGames: saved.status === "finished" ? [...s.statsGames, saved] : s.statsGames }));
    }
  },
};
