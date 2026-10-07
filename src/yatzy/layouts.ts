import type { BoardLayout, Category, Dice } from "./types";

/* ---------- dice scoring primitives (reusable by any layout) ---------- */
const counts = (d: Dice) => {
  const c: Record<number, number> = {};
  d.forEach((v) => (c[v] = (c[v] ?? 0) + 1));
  return c;
};
const sum = (d: Dice) => d.reduce((a, b) => a + b, 0);
const faces = (d: Dice) => Object.entries(counts(d)).map(([f, n]) => ({ f: +f, n }));

export const scorers = {
  face: (face: number) => (d: Dice) => d.filter((v) => v === face).length * face,
  /** Highest group of `size` equal dice, scored as face*size. */
  ofAKind: (size: number) => (d: Dice) => {
    const best = faces(d).filter((x) => x.n >= size).sort((a, b) => b.f - a.f)[0];
    return best ? best.f * size : 0;
  },
  /** `k` distinct pairs, highest faces. */
  pairs: (k: number) => (d: Dice) => {
    const p = faces(d).filter((x) => x.n >= 2).sort((a, b) => b.f - a.f);
    return p.length >= k ? p.slice(0, k).reduce((a, x) => a + x.f * 2, 0) : 0;
  },
  straight: (need: number[], points?: number) => (d: Dice) =>
    need.every((n) => d.includes(n)) ? (points ?? need.reduce((a, b) => a + b, 0)) : 0,
  /** Groups with given sizes, e.g. [3,2] full house. */
  groups: (sizes: number[], points?: number) => (d: Dice) => {
    const f = faces(d).sort((a, b) => b.n - a.n || b.f - a.f);
    const used: number[] = [];
    let total = 0;
    for (const s of [...sizes].sort((a, b) => b - a)) {
      const g = f.find((x) => x.n >= s && !used.includes(x.f));
      if (!g) return 0;
      used.push(g.f);
      total += g.f * s;
    }
    return points ?? total;
  },
  chance: sum,
  allSame: (points: number) => (d: Dice) => (new Set(d).size === 1 && d.length > 0 ? points : 0),
  /** US style: sum of all dice if at least `size` of a kind. */
  ofAKindSumAll: (size: number) => (d: Dice) => (faces(d).some((x) => x.n >= size) ? sum(d) : 0),
};

const upper = (n: number, diceCount: number): Category => ({
  id: ["", "ones", "twos", "threes", "fours", "fives", "sixes"][n],
  label: ["", "Ones", "Twos", "Threes", "Fours", "Fives", "Sixes"][n],
  sectionId: "upper",
  options: Array.from({ length: diceCount + 1 }, (_, i) => i * n),
  score: scorers.face(n),
});

const range = (from: number, to: number, step = 1) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

const SECTIONS = [
  { id: "upper", label: "Upper section" },
  { id: "lower", label: "Lower section" },
];

export const scandinavian: BoardLayout = {
  id: "scandinavian",
  name: "Yatzy (Scandinavian)",
  description: "15 categories, 5 dice, 50 bonus at 63.",
  diceCount: 5,
  sections: SECTIONS,
  categories: [
    ...[1, 2, 3, 4, 5, 6].map((n) => upper(n, 5)),
    { id: "pair", label: "One Pair", sectionId: "lower", options: range(2, 12, 2), score: scorers.pairs(1) },
    { id: "twopairs", label: "Two Pairs", sectionId: "lower", options: range(6, 22, 2), score: scorers.pairs(2) },
    { id: "three", label: "Three of a kind", sectionId: "lower", options: range(3, 18, 3), score: scorers.ofAKind(3) },
    { id: "four", label: "Four of a kind", sectionId: "lower", options: range(4, 24, 4), score: scorers.ofAKind(4) },
    { id: "small", label: "Small Straight", sectionId: "lower", options: [15], score: scorers.straight([1, 2, 3, 4, 5]) },
    { id: "large", label: "Large Straight", sectionId: "lower", options: [20], score: scorers.straight([2, 3, 4, 5, 6]) },
    { id: "house", label: "Full House", sectionId: "lower", options: range(7, 28), score: scorers.groups([3, 2]) },
    { id: "chance", label: "Chance", sectionId: "lower", options: range(5, 30), score: scorers.chance },
    { id: "yatzy", label: "Yatzy", sectionId: "lower", options: [50], score: scorers.allSame(50) },
  ],
  bonuses: [{ id: "bonus", label: "Upper bonus", sectionId: "upper", threshold: 63, value: 50 }],
};

export const yahtzee: BoardLayout = {
  id: "yahtzee",
  name: "Yahtzee (American)",
  description: "13 categories, fixed-point straights, 35 bonus.",
  diceCount: 5,
  sections: SECTIONS,
  categories: [
    ...[1, 2, 3, 4, 5, 6].map((n) => upper(n, 5)),
    { id: "three", label: "Three of a kind", sectionId: "lower", options: range(5, 30), score: scorers.ofAKindSumAll(3) },
    { id: "four", label: "Four of a kind", sectionId: "lower", options: range(5, 30), score: scorers.ofAKindSumAll(4) },
    { id: "house", label: "Full House", sectionId: "lower", options: [25], score: scorers.groups([3, 2], 25) },
    {
      id: "small",
      label: "Small Straight",
      sectionId: "lower",
      options: [30],
      score: (d) => Math.max(scorers.straight([1, 2, 3, 4], 30)(d), scorers.straight([2, 3, 4, 5], 30)(d), scorers.straight([3, 4, 5, 6], 30)(d)),
    },
    {
      id: "large",
      label: "Large Straight",
      sectionId: "lower",
      options: [40],
      score: (d) => Math.max(scorers.straight([1, 2, 3, 4, 5], 40)(d), scorers.straight([2, 3, 4, 5, 6], 40)(d)),
    },
    { id: "yatzy", label: "Yahtzee", sectionId: "lower", options: [50], score: scorers.allSame(50) },
    { id: "chance", label: "Chance", sectionId: "lower", options: range(5, 30), score: scorers.chance },
  ],
  bonuses: [{ id: "bonus", label: "Upper bonus", sectionId: "upper", threshold: 63, value: 35 }],
};

export const maxi: BoardLayout = {
  id: "maxi",
  name: "Maxi Yatzy",
  description: "6 dice, 20 categories, 100 bonus at 84.",
  diceCount: 6,
  sections: SECTIONS,
  categories: [
    ...[1, 2, 3, 4, 5, 6].map((n) => upper(n, 6)),
    { id: "pair", label: "One Pair", sectionId: "lower", options: range(2, 12, 2), score: scorers.pairs(1) },
    { id: "twopairs", label: "Two Pairs", sectionId: "lower", options: range(6, 22, 2), score: scorers.pairs(2) },
    { id: "threepairs", label: "Three Pairs", sectionId: "lower", options: range(12, 30, 2), score: scorers.pairs(3) },
    { id: "three", label: "Three of a kind", sectionId: "lower", options: range(3, 18, 3), score: scorers.ofAKind(3) },
    { id: "four", label: "Four of a kind", sectionId: "lower", options: range(4, 24, 4), score: scorers.ofAKind(4) },
    { id: "five", label: "Five of a kind", sectionId: "lower", options: range(5, 30, 5), score: scorers.ofAKind(5) },
    { id: "small", label: "Small Straight", sectionId: "lower", options: [15], score: scorers.straight([1, 2, 3, 4, 5]) },
    { id: "large", label: "Large Straight", sectionId: "lower", options: [20], score: scorers.straight([2, 3, 4, 5, 6]) },
    { id: "full", label: "Full Straight", sectionId: "lower", options: [21], score: scorers.straight([1, 2, 3, 4, 5, 6]) },
    { id: "house", label: "Full House", sectionId: "lower", options: range(7, 28), score: scorers.groups([3, 2]) },
    { id: "castle", label: "Castle (3+3)", sectionId: "lower", options: range(9, 33), score: scorers.groups([3, 3]) },
    { id: "tower", label: "Tower (4+2)", sectionId: "lower", options: range(8, 34), score: scorers.groups([4, 2]) },
    { id: "chance", label: "Chance", sectionId: "lower", options: range(6, 36), score: scorers.chance },
    { id: "yatzy", label: "Maxi Yatzy", sectionId: "lower", options: [100], score: scorers.allSame(100) },
  ],
  bonuses: [{ id: "bonus", label: "Upper bonus", sectionId: "upper", threshold: 84, value: 100 }],
};

/** Register new layouts here — everything else picks them up automatically. */
export const LAYOUTS: BoardLayout[] = [scandinavian, yahtzee, maxi];

export const getLayout = (id: string) => LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0]!;
