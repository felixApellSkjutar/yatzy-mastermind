import { useEffect, useRef, useState } from "react";
import type { BoardLayout, Category, CellValue } from "../types";
import { ENTRY_HELPERS } from "./entry-helpers";

interface Props {
  layout: BoardLayout;
  category: Category;
  current: CellValue;
  enabledHelpers: string[];
  onPick: (v: CellValue) => void;
  onClose: () => void;
}

export function ScoreEntryMenu({ layout, category, current, enabledHelpers, onPick, onClose }: Props) {
  const helpers = ENTRY_HELPERS.filter((h) => enabledHelpers.includes(h.id));
  const list = helpers.length ? helpers : ENTRY_HELPERS.slice(-1);
  const [tab, setTab] = useState(list[0]!.id);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const Active = (list.find((h) => h.id === tab) ?? list[0]!).Component;

  return (
    <div
      ref={ref}
      className="absolute left-1/2 top-full z-30 mt-2 w-72 -translate-x-1/2 animate-rise rounded-2xl bg-popover p-4 text-left shadow-2xl ring-1 ring-border"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-base italic">{category.label}</span>
        {current != null && (
          <button onClick={() => onPick(null)} className="text-[11px] text-muted-foreground hover:text-destructive">
            Clear
          </button>
        )}
      </div>
      {list.length > 1 && (
        <div className="mb-3 flex gap-1 rounded-full bg-muted p-1">
          {list.map((h) => (
            <button
              key={h.id}
              onClick={() => setTab(h.id)}
              className={`flex-1 rounded-full py-1 text-[11px] transition-colors ${
                tab === h.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {h.name}
            </button>
          ))}
        </div>
      )}
      <Active layout={layout} category={category} current={current} onPick={onPick} />
    </div>
  );
}
