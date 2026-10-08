import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { Board } from "@/yatzy/components/Board";
import { ImportLegacy } from "@/yatzy/components/ImportLegacy";
import { NewGameForm } from "@/yatzy/components/NewGameForm";
import { SettingsPanel } from "@/yatzy/components/SettingsPanel";
import { SideMenu } from "@/yatzy/components/SideMenu";
import { getLayout } from "@/yatzy/layouts";
import { currentRoundIndex } from "@/yatzy/logic";
import { actions, hydrateStore, onStoreError, useAppState } from "@/yatzy/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yatzy.Tray — Yatzy score keeper" },
      { name: "description", content: "Keep Yatzy scores for any number of players, with saved games, highscores and streaks." },
      { property: "og:title", content: "Yatzy.Tray — Yatzy score keeper" },
      { property: "og:description", content: "A felt-lined scorepad for game night: multiple layouts, saved games and highscores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const state = useAppState();
  useEffect(() => {
    hydrateStore().catch((e) => toast.error(e instanceof Error ? e.message : "Could not load data"));
    return onStoreError((m) => toast.error(m));
  }, []);
  const game = state.games.find((g) => g.id === state.activeGameId) ?? null;
  const layout = game ? getLayout(game.layoutId) : null;

  return (
    <div className="relative min-h-screen overflow-hidden text-sm">
      <div className="pointer-events-none absolute -left-32 -top-40 h-[560px] w-[560px] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-28 h-[520px] w-[520px] rounded-full bg-accent/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-8">
        <header className="relative z-20 mb-8 flex flex-wrap items-end justify-between gap-6">
          <div className="animate-rise">
            <h1 className="font-display text-3xl font-medium italic tracking-tight">
              Yatzy<span className="font-semibold not-italic text-primary">.Tray</span>
            </h1>
            <p className="mt-1 max-w-[40ch] text-xs text-muted-foreground">A felt-lined scorepad for the table.</p>
          </div>
          {state.status === "ready" && (
            <div className="flex animate-rise flex-wrap items-center gap-3" style={{ animationDelay: "120ms" }}>
              {game && layout && (
                <>
                  <div className="glass-pill px-4 py-2 text-xs">
                    <span className="text-muted-foreground">Board</span>{" "}
                    <span className="font-mono">{currentRoundIndex(layout, game) + 1}</span>{" "}
                    <span className="text-muted-foreground">of</span> <span className="font-mono">{game.rounds}</span>
                  </div>
                  <button onClick={() => actions.closeGame()} className="glass-pill px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                    {game.status === "finished" || !actions.canEdit(game) ? "Close" : "Pause"}
                  </button>
                </>
              )}
              <span className="glass-pill px-3 py-2 text-xs">{state.me?.displayName}</span>
              {state.me?.isAdmin && (
                <Link to="/admin" className="glass-pill px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                  Admin
                </Link>
              )}
              <button onClick={() => actions.signOut()} className="glass-pill px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                Sign out
              </button>
              <SettingsPanel settings={state.settings} />
            </div>
          )}
        </header>

        {state.status === "loading" && <p className="text-xs text-muted-foreground">Loading…</p>}

        {state.status === "signedOut" && (
          <div className="glass-card mx-auto max-w-md animate-rise p-8 text-center">
            <h2 className="font-display text-2xl italic">Pull up a chair</h2>
            <p className="mt-2 text-xs text-muted-foreground">Sign in or create a player account to keep score, save games and climb the highscores.</p>
            <Link to="/auth" className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm text-primary-foreground">
              Sign in / Sign up
            </Link>
          </div>
        )}

        {state.status === "ready" && state.me && (
          <>
            <ImportLegacy meId={state.me.id} />
            <div className="flex flex-col items-start gap-6 lg:flex-row">
              <main className="w-full min-w-0 flex-1 animate-rise" style={{ animationDelay: "200ms" }}>
                {game ? (
                  <Board game={game} players={state.players} settings={state.settings} />
                ) : (
                  <NewGameForm
                    key={state.settings.defaultLayoutId + state.settings.defaultRounds}
                    players={state.players}
                    settings={state.settings}
                    meId={state.me.id}
                  />
                )}
              </main>
              <SideMenu state={state} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
