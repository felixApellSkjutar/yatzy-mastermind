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
- App state is a tiny external store (src/yatzy/store.ts) persisted to localStorage; turn order, current board and totals are derived, never stored. Why: single source of truth, no sync bugs.
