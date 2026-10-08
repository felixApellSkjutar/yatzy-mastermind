// Pure move advisor: given dice, throws left and open boxes, find the best dice to keep.
// Exact single-turn expectimax over kept-dice multisets, cached. Runs on the server.
import type { BoardLayout, Dice } from "./types";

export interface Advice {
  /** Dice values to keep (empty = reroll all). With 0 throws left this is all dice. */
  keep: number[];
  /** Category id the move aims for. */
  target: string;
  targetLabel: string;
  /** Chance (0..1) to score > 0 in the target. */
  probability: number;
  /** Expected points of the move. */
  expected: number;
}

interface Ctx {
  layout: BoardLayout;
  open: BoardLayout["categories"];
  upperSoFar: number;
}

/** Swappable value rule: raw points, plus a small boost for upper boxes that keep you on bonus pace. */
export function boxValue(ctx: Ctx, cid: string, dice: Dice): number {
  const cat = ctx.layout.categories.find((c) => c.id === cid)!;
  const pts = cat.score?.(dice) ?? 0;
  const bonus = ctx.layout.bonuses.find((b) => b.sectionId === cat.sectionId);
  if (bonus && ctx.upperSoFar < bonus.threshold) {
    const face = pts / Math.max(1, dice.filter((d) => d * dice.filter((x) => x === d).length === pts).length || 1);
    const faceVal = ["ones", "twos", "threes", "fours", "fives", "sixes"].indexOf(cid) + 1;
    if (faceVal > 0 && pts >= faceVal * 3) return pts + bonus.value * 0.1;
    void face;
  }
  return pts;
}

const key = (d: number[]) => [...d].sort().join("");

const rollCache = new Map<number, { dice: number[]; p: number }[]>();
function rollsOf(n: number) {
  if (rollCache.has(n)) return rollCache.get(n)!;
  const out = new Map<string, { dice: number[]; p: number }>();
  const total = 6 ** n;
  const rec = (acc: number[]) => {
    if (acc.length === n) {
      const k = key(acc);
      const e = out.get(k);
      if (e) e.p += 1 / total;
      else out.set(k, { dice: [...acc].sort(), p: 1 / total });
      return;
    }
    for (let f = 1; f <= 6; f++) rec([...acc, f]);
  };
  rec([]);
  const list = [...out.values()];
  rollCache.set(n, list);
  return list;
}

function keepsOf(dice: number[]) {
  const seen = new Map<string, number[]>();
  for (let m = 0; m < 1 << dice.length; m++) {
    const k = dice.filter((_, i) => m & (1 << i));
    seen.set(key(k), [...k].sort());
  }
  return [...seen.values()];
}

/** Outcome of optimal play: expected value and how often each category is finally used (and non-zero). */
interface Res { ev: number; cat: Record<string, { p: number; hit: number }> }

export function advise(
  layout: BoardLayout,
  dice: Dice,
  rollsLeft: number,
  openIds: string[],
  upperSoFar: number,
  limit = 5,
): Advice[] {
  const ctx: Ctx = { layout, open: layout.categories.filter((c) => openIds.includes(c.id)), upperSoFar };
  if (!ctx.open.length) return [];
  const n = dice.length;
  const stateCache = new Map<string, Res>();
  const keepCache = new Map<string, Res>();

  const finalChoice = (d: number[]) => {
    let best = ctx.open[0]!.id, bv = -1;
    for (const c of ctx.open) {
      const v = boxValue(ctx, c.id, d);
      if (v > bv) { bv = v; best = c.id; }
    }
    return { best, bv, hit: (layout.categories.find((c) => c.id === best)!.score?.(d) ?? 0) > 0 };
  };

  const state = (d: number[], r: number): Res => {
    const k = key(d) + "|" + r;
    const hit = stateCache.get(k);
    if (hit) return hit;
    let res: Res;
    if (r === 0) {
      const f = finalChoice(d);
      res = { ev: f.bv, cat: { [f.best]: { p: 1, hit: f.hit ? 1 : 0 } } };
    } else {
      res = state(d, 0);
      for (const kp of keepsOf(d)) {
        const kr = keep(kp, r);
        if (kr.ev > res.ev) res = kr;
      }
    }
    stateCache.set(k, res);
    return res;
  };

  const keep = (kp: number[], r: number): Res => {
    const k = key(kp) + "|" + r;
    const hit = keepCache.get(k);
    if (hit) return hit;
    const res: Res = { ev: 0, cat: {} };
    for (const o of rollsOf(n - kp.length)) {
      const s = state([...kp, ...o.dice], r - 1);
      res.ev += o.p * s.ev;
      for (const [c, v] of Object.entries(s.cat)) {
        const e = (res.cat[c] ??= { p: 0, hit: 0 });
        e.p += o.p * v.p;
        e.hit += o.p * v.hit;
      }
    }
    keepCache.set(k, res);
    return res;
  };

  const label = (cid: string) => layout.categories.find((c) => c.id === cid)?.label ?? cid;
  const toAdvice = (kp: number[], r: Res): Advice => {
    const [target, v] = Object.entries(r.cat).sort((a, b) => b[1].p - a[1].p)[0]!;
    return { keep: kp, target, targetLabel: label(target), probability: v.p ? v.hit : 0, expected: round(r.ev) };
  };

  if (rollsLeft <= 0) {
    return ctx.open
      .map((c) => ({ c, v: boxValue(ctx, c.id, dice), pts: c.score?.(dice) ?? 0 }))
      .sort((a, b) => b.v - a.v)
      .slice(0, limit)
      .map(({ c, pts }) => ({ keep: [...dice], target: c.id, targetLabel: c.label, probability: pts > 0 ? 1 : 0, expected: pts }));
  }
  return keepsOf([...dice])
    .map((kp) => toAdvice(kp, kp.length === n ? state(kp, 0) : keep(kp, rollsLeft)))
    .sort((a, b) => b.expected - a.expected)
    .slice(0, limit);
}

const round = (x: number) => Math.round(x * 10) / 10;
