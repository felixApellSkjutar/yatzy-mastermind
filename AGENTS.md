<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Yatzy domain lives in src/yatzy: layouts, scoring strategies, entry helpers and stats are registries (arrays) — add features by registering entries, not by editing components. Why: keeps the app easy to extend.
- App state is a tiny external store (src/yatzy/store.ts) hydrated from and saved to the server via server functions in src/lib/api.functions.ts; turn order, current board, totals and guest lists are derived, never stored. localStorage only holds the active-game id and the one-time legacy import. Why: single source of truth, no sync bugs.
- No cloud services: data lives in a local SQLite file via Node's built-in node:sqlite (src/lib/db.server.ts, append-only MIGRATIONS). Why: must run on localhost or a small home server.
- Auth is self-built (src/lib/auth.server.ts): scrypt password hashes, hashed session tokens in a sessions table, httpOnly cookie; roles live in user_roles, never on users. Every server function checks the caller itself. Why: no external auth provider, no privilege escalation.
- Game completion/winners are recomputed server-side with the shared finalizeGame (src/yatzy/finalize.ts). Why: highscores can't be faked by the client.
- Self-hosting builds with NITRO_PRESET=node-server (see README). Why: the default edge target has no SQLite/filesystem.
