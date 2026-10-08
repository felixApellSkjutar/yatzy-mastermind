# Online accounts, games and highscores

## What you get
- **Sign up / sign in** with email + password (email confirmation, forgot-password page).
- **Every player is an account** with a unique display name. Highscores, wins and streaks follow the person across devices.
- **Starting a game:** the signed-in host picks players by searching registered names (plus themselves). Guest seats (name only, no account) are still allowed, but they don't count toward highscores.
- **Scorekeeping:** the host (game creator) enters scores. Every player in a game can see it in their "Saved games" list and continue it if paused.
- **Highscores & streaks** are global across all accounts and computed from finished games in the database.
- **Admin page** (`/admin`): list all users, see their game counts, delete a user or a game, and grant or remove admin rights. The first account you create becomes admin.
- **Import on first sign-in:** if this browser has local players and games, a dialog offers to upload the games into your account. Local player names get matched to accounts, or become guest seats.
- Settings (default board, reveal seconds, etc.) are stored per account.

## Pages
```text
/auth            sign in / sign up
/reset-password  set a new password
/                game table (requires sign-in; shows a sign-in prompt otherwise)
/admin           admin only
```

## Technical details
- Fully self-hosted, no cloud services: the app runs as one Node server (TanStack Start Node build) with a local SQLite database file (e.g. `data/yatzy.db`). It works on localhost, a Raspberry Pi or a home server. A `Dockerfile` + `docker-compose.yml` and a README section cover home hosting and backups (copy the db file).
- Database access with Drizzle ORM + `better-sqlite3`. Migrations run automatically on startup. Swapping to a local Postgres later is a config change.
- Own auth: passwords hashed with Node `crypto.scrypt`, server-side `sessions` table, httpOnly secure session cookie. Email confirmation and password reset by email only work if SMTP settings are provided (optional env vars). Otherwise an admin can reset a user's password from `/admin`.
- Tables:
  - `users` (id, email unique, password_hash, display_name unique, settings json, created_at).
  - `user_roles` (user_id, role: admin | user), kept separate from users. The first registered account becomes admin.
  - `sessions` (id, user_id, expires_at).
  - `games` (id, owner_id, name, layout_id, strategy_id, rounds, status, sheets json, final_totals json, winner_ids, timestamps).
  - `game_players` (game_id, seat, user_id nullable, guest_name nullable).
  - Access rules, enforced in server functions on every request: everyone signed in can read profiles; games are visible to the owner, participants and admins; only the owner or an admin can write. Admin checks read `user_roles` server-side.
- All data access goes through `createServerFn` functions (`*.functions.ts`), with the db code kept in `*.server.ts`.
- Store refactor: keep the same `useAppState()` / `actions` API in `src/yatzy/store.ts`, but back it with TanStack Query + the app's own server functions. Score edits update optimistically and are saved with a short debounce. Turn order and totals stay derived. Layout/strategy/helper registries stay unchanged.
- `stats.ts` reads finished games from the database and ignores guest seats.
- Note: the Lovable preview environment can't run a native SQLite server. The preview will use a pure-JS SQLite fallback, or the full app can be tested by running it locally.
- Update `AGENTS.md`: the store is now backed by a self-hosted database through server functions, and localStorage is only used for the one-time import.
