# Move advisor: "What should I keep?"

## What you get
- A round **dice button in the lower-left corner** during an active game (hidden when there's no game or it's finished).
- Clicking it opens a small panel for **the player whose turn it is**:
  - Five (or six for Maxi) dice you tap to set their face, 1–6.
  - A **"Throws left" selector**: 2, 1 or 0. It starts at 2 every time the panel opens.
  - An **"Advise"** button.
- The result is a **list of the 3–5 best moves**, best first. Each move shows:
  - **Which dice to keep.** The kept dice are highlighted and the rest are marked "reroll".
  - **The box it's aiming for**, e.g. "Full House", plus the chance of making it, e.g. "62% chance".
  - **Expected points**, e.g. "≈ 18.4 pts".
- With 0 throws left, the list shows **where to score the current dice** instead: the best open boxes and their points.
- **Only boxes that player hasn't filled on the current board are suggested.** Once your Full House is filled, it's never suggested again.
- The upper bonus counts in the advice: a move that keeps you on track for the bonus gets a small boost.
- A **"Use this"** button on each throw-0 suggestion opens the normal score entry for that box with the points pre-filled. You still confirm the score yourself.

## How the advice is calculated
- The calculation runs on your own server, with no cloud services.
- There are only 32 ways to keep some of 5 dice, so the app checks every one. For each, it works out the odds of each outcome on the next throw.
  - With 1 throw left: the move's value is the best open box you could reach, on average.
  - With 2 throws left: the app also checks the best keep after the next throw, one level deep. This is exact for a single turn and fast: well under 100 ms for 5 dice.
- Each move is labelled with the box it most often ends in and the chance of reaching a non-zero score there.
- For Maxi (6 dice), the same method applies, with simple caching to keep it fast.
- Moves that keep the same dice are merged, and the top 5 are returned.

## Technical details
- New `src/yatzy/advisor.ts`: a pure function `advise(layout, dice, rollsLeft, openCategoryIds, upperSoFar)`. It uses the scoring rules each layout already defines, so it works with every board layout. A small, swappable "value" rule covers bonus awareness, so the advisor stays easy to change.
- New server function `getAdvice` in `src/lib/api.functions.ts`:
  - Signed-in users only.
  - It checks the input: a known layout, dice values 1–6 with the right count, throws left 0–2, and open boxes that exist in that layout.
  - It looks up the layout by id and returns plain data: `{ keep: number[], target, probability, expected }[]`.
- The client works out the open boxes from the current board for the player whose turn it is. The scorekeeping data isn't changed.
- New `src/yatzy/components/AdvisorButton.tsx`: a fixed lower-left button plus a popover panel, using the existing frosted-glass style. It's mounted in `src/routes/index.tsx` next to the Board.
- `AGENTS.md`: add a rule that the advisor is a pure module run on the server and reuses the layout scoring rules.
