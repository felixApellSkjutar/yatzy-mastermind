import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn, signUp } from "@/lib/api.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Yatzy.Tray" },
      { name: "description", content: "Sign in or create your Yatzy.Tray player account." },
      { property: "og:title", content: "Sign in — Yatzy.Tray" },
      { property: "og:description", content: "Create a player account to save games and track highscores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const field = "w-full rounded-xl bg-panel px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-primary/50";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "in"
          ? await signIn({ data: { email, password } })
          : await signUp({ data: { email, password, displayName: name } });
      if (res.error) setError(res.error);
      else navigate({ to: "/", replace: true });
    } catch (err) {
      setError(mode === "up" ? "Check your details: valid email, a name, and a password of 8+ characters." : "Sign-in failed.");
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-6 text-sm">
      <form onSubmit={submit} className="glass-card w-full max-w-sm animate-rise space-y-4 p-8">
        <h1 className="font-display text-3xl italic">
          Yatzy<span className="font-semibold not-italic text-primary">.Tray</span>
        </h1>
        <p className="text-xs text-muted-foreground">{mode === "in" ? "Welcome back to the table." : "Create your player account."}</p>
        {mode === "up" && (
          <label className="block space-y-1.5">
            <span className="eyebrow">Player name</span>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />
          </label>
        )}
        <label className="block space-y-1.5">
          <span className="eyebrow">Email</span>
          <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="block space-y-1.5">
          <span className="eyebrow">Password</span>
          <input
            className={field}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "up" ? 8 : 1}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />
        </label>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button disabled={busy} className="w-full rounded-full bg-primary py-2.5 text-primary-foreground disabled:opacity-40">
          {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setError(null);
          }}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
        {mode === "in" && <p className="text-center text-[11px] text-muted-foreground">Forgot your password? Ask an admin to reset it.</p>}
      </form>
    </div>
  );
}
