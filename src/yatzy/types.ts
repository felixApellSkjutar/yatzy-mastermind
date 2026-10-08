export type Dice = number[];
export type CellValue = number | null;

/** A single scorable row on the board. */
export interface Category {
  id: string;
  label: string;
  sectionId: string;
  /** Quick-pick values offered in the entry menu. */
  options?: number[];
  /** Score a dice roll for this category (used by the dice helper). */
  score?: (dice: Dice) => number;
}

/** A computed row (e.g. upper bonus). */
export interface BonusRule {
  id: string;
  label: string;
  sectionId: string;
  threshold: number;
  value: number;
}

export interface BoardLayout {
  id: string;
  name: string;
  description: string;
  diceCount: number;
  sections: { id: string; label: string }[];
  categories: Category[];
  bonuses: BonusRule[];
}

/** playerId -> categoryId -> value */
export type RoundSheet = Record<string, Record<string, CellValue>>;

export type GameStatus = "active" | "paused" | "finished";

export interface Game {
  id: string;
  name: string;
  layoutId: string;
  strategyId: string;
  /** Account ids, or guest ids (prefixed "g_") whose names live in `guests`. */
  playerIds: string[];
  guests?: Record<string, string> | undefined;
  ownerId?: string | undefined;
  rounds: number;
  sheets: RoundSheet[];
  status: GameStatus;
  createdAt: number;
  updatedAt: number;
  finalTotals?: Record<string, number> | undefined;
  winnerIds?: string[] | undefined;
}

export interface Player {
  id: string;
  name: string;
  createdAt: number;
  guest?: boolean;
}

export interface Settings {
  defaultLayoutId: string;
  defaultStrategyId: string;
  defaultRounds: number;
  revealSeconds: number;
  enabledHelpers: string[];
  blurTotals: boolean;
}

export interface Me {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  settings: Partial<Settings> | null;
}

export interface AppState {
  /** "loading" until the session is known. */
  status: "loading" | "signedOut" | "ready";
  me: Me | null;
  /** Registered accounts plus guests seen in your games. */
  players: Player[];
  /** Games you host or play in. */
  games: Game[];
  /** All finished games, for global highscores. */
  statsGames: Game[];
  activeGameId: string | null;
  settings: Settings;
}
