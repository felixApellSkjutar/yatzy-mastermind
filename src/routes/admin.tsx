import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { adminDeleteUser, adminOverview, adminResetPassword, adminSetAdmin, deleteGame } from "@/lib/api.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Yatzy.Tray" },
      { name: "description", content: "Manage Yatzy.Tray players, roles and games." },
      { property: "og:title", content: "Admin — Yatzy.Tray" },
      { property: "og:description", content: "Manage players, roles and games." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin"], queryFn: () => adminOverview(), retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const run = async (p: Promise<{ error?: string | null } | unknown>, ok: string) => {
    try {
      const r = (await p) as { error?: string | null };
      if (r?.error) toast.error(r.error);
      else toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
    refresh();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8 text-sm">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-3xl italic">Admin</h1>
        <Link to="/" className="glass-pill px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
          ← Back to the table
        </Link>
      </div>
      {q.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {q.error && <p className="text-xs text-destructive">{q.error.message}</p>}
      {q.data && (
        <>
          <section className="glass-card p-5">
            <div className="eyebrow mb-3">Players · {q.data.users.length}</div>
            {q.data.users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 border-b py-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <div>
                    {u.name} {u.isAdmin && <span className="ml-1 font-mono text-[10px] text-primary">admin</span>}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {u.email} · {u.games} games · joined {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => run(adminSetAdmin({ data: { userId: u.id, admin: !u.isAdmin } }), "Role updated")}
                >
                  {u.isAdmin ? "Remove admin" : "Make admin"}
                </button>
                <button
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const pw = prompt(`New password for ${u.name} (8+ characters)`);
                    if (pw) run(adminResetPassword({ data: { userId: u.id, password: pw } }), "Password reset");
                  }}
                >
                  Reset password
                </button>
                <button
                  className="text-[11px] text-muted-foreground hover:text-destructive"
                  onClick={() => confirm(`Delete ${u.name} and the games they host?`) && run(adminDeleteUser({ data: { userId: u.id } }), "Player deleted")}
                >
                  Delete
                </button>
              </div>
            ))}
          </section>
          <section className="glass-card p-5">
            <div className="eyebrow mb-3">Games · {q.data.games.length}</div>
            {q.data.games.length === 0 && <p className="text-xs text-muted-foreground">No games yet.</p>}
            {q.data.games.map((g) => (
              <div key={g.id} className="flex items-center gap-3 border-b py-2 last:border-0">
                <div className="flex-1">
                  <div>{g.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {g.status} · host {g.owner} · {new Date(g.updatedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  className="text-[11px] text-muted-foreground hover:text-destructive"
                  onClick={() => confirm("Delete this game?") && run(deleteGame({ data: { id: g.id } }), "Game deleted")}
                >
                  Delete
                </button>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
