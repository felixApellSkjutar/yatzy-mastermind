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
- Enable Lovable Cloud and turn on email auth.
- Tables (all with GRANTs and row-level security):
  - `profiles` (id = auth user, display_name unique, settings jsonb), auto-created on signup by a trigger.
  - `user_roles` + `has_role()` security-definer function (enum `app_role`: admin, user). A trigger makes the first signup an admin.
  - `games` (id, owner_id, name, layout_id, strategy_id, rounds, status, sheets jsonb, final_totals jsonb, winner_ids, timestamps).
  - `game_players` (game_id, seat, profile_id nullable, guest_name nullable).
  - RLS: everyone signed in can read profiles; games are visible to the owner, participants and admins; only the owner or an admin can write. Admins can manage everything.
- Store refactor: keep the same `useAppState()` / `actions` API in `src/yatzy/store.ts`, but back it with TanStack Query + the Cloud client. Score edits update optimistically and are saved with a short debounce. Turn order and totals stay derived. Layout/strategy/helper registries stay unchanged.
- `stats.ts` reads finished games from the database and ignores guest seats.
- Update `AGENTS.md`: the store is now Cloud-backed, and localStorage is only used for the one-time import.
