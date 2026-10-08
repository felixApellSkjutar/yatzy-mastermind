import { toast } from "sonner";
import { changePassword } from "@/lib/api.functions";
import { useEffect, useRef, useState } from "react";
import { LAYOUTS } from "../layouts";
import { actions } from "../store";
import { STRATEGIES } from "../strategies";
import type { Settings } from "../types";
import { ENTRY_HELPERS } from "./entry-helpers";

const field = "w-full rounded-xl bg-panel px-3 py-1.5 text-xs ring-1 ring-border outline-none";

export function SettingsPanel({ settings }: { settings: Settings }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const toggleHelper = (id: string) =>
    actions.updateSettings({
      enabledHelpers: settings.enabledHelpers.includes(id)
        ? settings.enabledHelpers.filter((x) => x !== id)
        : [...settings.enabledHelpers, id],
    });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="glass-pill px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ⚙ Settings
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 animate-rise space-y-4 rounded-3xl bg-popover p-5 shadow-2xl ring-1 ring-border">
          <div className="font-display text-lg italic">Settings</div>
          <label className="block space-y-1">
            <span className="eyebrow">Default layout</span>
            <select className={field} value={settings.defaultLayoutId} onChange={(e) => actions.updateSettings({ defaultLayoutId: e.target.value })}>
              {LAYOUTS.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="eyebrow">Default scoring</span>
            <select className={field} value={settings.defaultStrategyId} onChange={(e) => actions.updateSettings({ defaultStrategyId: e.target.value })}>
              {STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="eyebrow">Default boards</span>
              <input type="number" min={1} max={10} className={field} value={settings.defaultRounds}
                onChange={(e) => actions.updateSettings({ defaultRounds: Math.max(1, Math.min(10, +e.target.value || 1)) })} />
            </label>
            <label className="block space-y-1">
              <span className="eyebrow">Peek seconds</span>
              <input type="number" min={1} max={15} className={field} value={settings.revealSeconds}
                onChange={(e) => actions.updateSettings({ revealSeconds: Math.max(1, Math.min(15, +e.target.value || 1)) })} />
            </label>
          </div>
          <div className="space-y-1.5">
            <span className="eyebrow">Score entry menu</span>
            <div className="flex flex-wrap gap-1.5">
              {ENTRY_HELPERS.map((h) => {
                const on = settings.enabledHelpers.includes(h.id);
                return (
                  <button key={h.id} onClick={() => toggleHelper(h.id)}
                    className={`rounded-full px-3 py-1 text-xs ring-1 ${on ? "bg-primary text-primary-foreground ring-primary" : "bg-panel ring-border"}`}>
                    {h.name}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center justify-between text-xs">
            <span>Blur totals until game over</span>
            <input type="checkbox" checked={settings.blurTotals} onChange={(e) => actions.updateSettings({ blurTotals: e.target.checked })} className="accent-primary" />
          </label>
          <form
            className="space-y-1.5 border-t pt-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              try {
                const r = await changePassword({ data: { current: String(f.get("current")), next: String(f.get("next")) } });
                if (r.error) toast.error(r.error);
                else {
                  toast.success("Password changed");
                  form.reset();
                }
              } catch {
                toast.error("New password must be at least 8 characters");
              }
            }}
          >
            <span className="eyebrow">Change password</span>
            <input name="current" type="password" placeholder="Current password" className={field} required autoComplete="current-password" />
            <input name="next" type="password" placeholder="New password (8+)" className={field} required minLength={8} autoComplete="new-password" />
            <button className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">Update</button>
          </form>
        </div>
      )}
    </div>
  );
}
