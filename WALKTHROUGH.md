# Demo walkthrough (5 minutes) and code Q&A

## Demo script

1. **Open the live URL on a phone-sized window and a desktop one** (30 s) – show it is responsive.
2. **Home → Play vs Computer → Hard** (30 s) – type a name, press Start. The tutorial opens (first visit).
3. **Play with the keyboard only** (60 s) – `Space` to roll, `P` to pass. Point at the status banner.
   Mention a screen reader announces the same text.
4. **Let the computer play** (30 s) – its rolls are animated; explain the server decided them.
5. **Show the backend** (60 s) – open `/api/health`, then DevTools → Network: the roll response contains the
   value; there is no way to send your own. Try a roll without the token (or edit it) → `403`.
6. **Refresh the page mid-game** (15 s) – the game comes back from Postgres.
7. **Finish a game (set max score to 25 beforehand), open Leaderboard and your player page** (45 s).
8. **Turn the network off and roll** (15 s) – friendly error, then it recovers.

## The three improvements

1. **Computer opponent** – `botShouldHold` in `api/_lib/game.js`; the server plays the whole turn and returns the steps.
2. **Leaderboard / stats / history** – SQL aggregates in `api/leaderboard.js` and `api/player.js` over finished games.
3. **Accessibility** – tutorial (`Tutorial.jsx`), keyboard shortcuts (`Game.jsx`), live-region announcements (`StatusBanner.jsx`), reduce-motion.

## How a roll works (follow this when asked "explain your code")

1. Player presses Space or taps the die → `roll()` in `src/routes/play_friends_live/LivePage.jsx`.
2. It calls `POST /api/games/:id/roll` with the secret `x-game-token` (`src/api/client.js`).
3. `api/games/[id]/roll.js` opens a transaction, **locks the game row** (`FOR UPDATE`), checks the token,
   rolls with `crypto.randomInt`, applies the rules with `applyRoll` (`api/_lib/game.js`), saves the new
   scores and logs the roll in the `rolls` table.
4. The browser waits for the response *and* the 1.5 s tumble animation, then shows the server's result.

## Database (3 tables, created automatically in `api/_lib/schema.js`)

- `games` – settings, whose turn, status, winner, secret token.
- `game_players` – name, avatar, bot flag, total and running points per player.
- `rolls` – every roll / bust / pass in order.

## Likely questions

- **Why can't players cheat?** Dice and scoring are server-side; the browser only says "roll" or "pass".
  The token stops other people acting in your game; the row lock stops double-clicking from double-rolling.
- **Why Postgres?** Leaderboard and history are relational queries (joins, GROUP BY, window of last 20 games).
- **Why does Hold need a roll first?** Otherwise a player could skip turns for free; the server enforces it (HTTP 422).
- **What are the bot strategies?** Easy: banks randomly between 8–13. Medium: hold at 20. Hard: 20 normally,
  30 if you are within 25 of winning, 15 if it leads by 25+, never banks within 10 of winning.
- **How are tables created?** `ensureSchema()` in `api/_lib/db.js` runs `CREATE TABLE IF NOT EXISTS` once per
  server start, guarded by a Postgres advisory lock.
- **What would you improve?** Passwords/accounts for the leaderboard, rate limiting, online multiplayer rooms.
- **How is it tested?** `npm test`: unit tests for rules/validation/bot and integration tests that call the
  real handlers against Postgres (wrong token, bad ids, concurrent rolls replayed from the log, full games).
