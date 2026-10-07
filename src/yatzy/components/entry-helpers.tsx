import { useState, type ComponentType } from "react";
import type { BoardLayout, Category, CellValue } from "../types";

export interface EntryHelperProps {
  layout: BoardLayout;
  category: Category;
  current: CellValue;
  onPick: (v: CellValue) => void;
}

/** An entry helper is a tab in the score-entry menu. Register new ones in ENTRY_HELPERS. */
export interface EntryHelper {
  id: string;
  name: string;
  Component: ComponentType<EntryHelperProps>;
}

const chip =
  "rounded-lg px-2 py-1.5 font-mono text-xs ring-1 ring-border transition-colors hover:bg-primary/10 hover:text-primary";

function QuickPick({ category, current, onPick }: EntryHelperProps) {
  const opts = category.options ?? [];
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {opts.map((v) => (
        <button
          key={v}
          onClick={() => onPick(v)}
          className={`${chip} ${current === v ? "bg-primary/15 text-primary ring-primary/30" : ""}`}
        >
          {v}
        </button>
      ))}
      {!opts.includes(0) && (
        <button onClick={() => onPick(0)} className={`${chip} text-muted-foreground`}>
          0
        </button>
      )}
    </div>
  );
}

function DicePicker({ layout, category, onPick }: EntryHelperProps) {
  const [dice, setDice] = useState<number[]>(() => Array(layout.diceCount).fill(1));
  const score = category.score?.(dice) ?? 0;
  if (!category.score) return <p className="text-xs text-muted-foreground">No dice rule for this row.</p>;
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {dice.map((d, i) => (
          <button
            key={i}
            onClick={() => setDice((ds) => ds.map((x, j) => (j === i ? (x % 6) + 1 : x)))}
            className="grid size-9 place-items-center rounded-lg bg-panel font-mono text-sm ring-1 ring-border hover:ring-primary/40"
            aria-label={`Die ${i + 1}: ${d}`}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Tap dice to change · scores <span className="font-mono text-primary">{score}</span>
        </span>
        <button
          onClick={() => onPick(score)}
          className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground"
        >
          Use
        </button>
      </div>
    </div>
  );
}

function Numpad({ current, onPick }: EntryHelperProps) {
  const [v, setV] = useState(current?.toString() ?? "");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const n = parseInt(v, 10);
        if (!Number.isNaN(n)) onPick(n);
      }}
    >
      <input
        autoFocus
        inputMode="numeric"
        value={v}
        onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ""))}
        className="w-full rounded-lg bg-panel px-3 py-1.5 font-mono text-sm ring-1 ring-border outline-none focus:ring-primary/50"
        placeholder="Score"
      />
      <button className="rounded-full bg-primary px-3 text-xs text-primary-foreground">Set</button>
    </form>
  );
}

export const ENTRY_HELPERS: EntryHelper[] = [
  { id: "quick", name: "Quick pick", Component: QuickPick },
  { id: "dice", name: "Dice", Component: DicePicker },
  { id: "numpad", name: "Type", Component: Numpad },
];
