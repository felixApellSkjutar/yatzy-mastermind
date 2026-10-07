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
  playerIds: string[];
  rounds: number;
  sheets: RoundSheet[];
  status: GameStatus;
  createdAt: number;
  updatedAt: number;
  finalTotals?: Record<string, number>;
  winnerIds?: string[];
}

export interface Player {
  id: string;
  name: string;
  createdAt: number;
}

export interface Settings {
  defaultLayoutId: string;
  defaultStrategyId: string;
  defaultRounds: number;
  revealSeconds: number;
  enabledHelpers: string[];
  blurTotals: boolean;
}

export interface AppState {
  players: Player[];
  games: Game[];
  activeGameId: string | null;
  settings: Settings;
}
