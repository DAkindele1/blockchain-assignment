# Greedy Pig Reimagined

CSC 419 – Advances in Web, Mobile and Blockchain Development (Pan-Atlantic University)
Group project, 2026/2027 first semester.

Built on top of the base game by [Hemephelus](https://github.com/Hemephelus/greed_pig).

## Team

| Name | Matric number |
| ---- | ------------- |
| Enomfon Okon | 23120112042 |
| Oluwasegun Da-Silva | 2312011200 |
| David Akindele | 23120112008 |
| Oluwasegun Da-Silva | 23120112012 |
| David Akindele | 2312011200 |

## Live URL


## What changed from the base game

The base game kept all dice and scores in the browser, so anything could be edited in dev tools.
Now a real backend owns the game:

- **Server-side dice and scoring.** The browser only asks "roll" or "pass"; the server rolls
  (`crypto.randomInt`), applies the rules and stores the result in Postgres.
- **Anti-cheat.** Each game has a secret token that only the creator's browser holds, rolls on the
  same game are serialised with a row lock, and holding with nothing rolled is rejected.
- **Resumable games.** Refreshing the page reloads the game from the database.

## Improvement 1 – Computer opponents (Easy / Medium / Hard)

Choose **Vs computer** on the setup screen and pick a difficulty. The bot's decisions are made on the
server (`botShouldHold` in `api/_lib/game.js`), so its strategy can't be inspected or tampered with
from the browser. The server returns the bot's full turn as a list of steps and the browser replays
them with the dice animation.

| Level | Strategy |
| ----- | -------- |
| Easy | Banks erratically, somewhere between 8 and 13 turn points |
| Medium | The classic "hold at 20" strategy |
| Hard | Banks at 20, but takes more risk (30) when you are within 25 points of winning, plays safe (15) when it leads by 25+, and always keeps rolling when it is 10 or fewer points from winning |

## Improvement 2 – Competition: leaderboard, stats and match history

Every roll, bust and pass is stored, and finished games feed three screens:

- **`/leaderboard`** – top 20 players by wins (win rate and games played break ties), plus how often
  each beat the computer. A search box jumps to any player's page.
- **`/player/:name`** – games played, wins, losses, win rate, wins vs computer, current win streak
  and the last 20 matches with opponents and scores.
- Only **finished** games count and the computer is never ranked. Names are matched case-insensitively.

The numbers are computed with SQL aggregates over `games`, `game_players` and `rolls`
(`api/leaderboard.js`, `api/player.js`).

## Improvement 3 – Accessibility and experience

The base game already had sound effects and a mute switch. This version adds:

- **Interactive tutorial** – a step-by-step dialog shown the first time a game opens, and reopenable any
  time from the menu, the setup screen or by pressing `?`.
- **Full keyboard play** – `Space`/`R` roll, `P`/`H` pass, `M` sound, `?` help. Focus is always visible,
  and the tutorial traps focus and closes with `Esc`.
- **Screen-reader support** – every roll, bust, pass and turn change is announced through a live region;
  tables have captions, `aria-current` marks the active player, controls have proper labels, decorative
  pig images are hidden from assistive tech, and winner/tutorial popups are real dialogs.
- **Reduce-motion support** – the dice tumble shortens and confetti is skipped if the device asks for less motion.
- Checked with the axe-core WCAG 2 A/AA audit (0 violations on home, setup, game and leaderboard).

## User-friendliness

- New players can press **Start Game** straight away (pigs have default names) and the tutorial explains the rest.
- Responsive layouts for phones and desktops; the status banner stays pinned so feedback is never off-screen.
- Clear feedback on every action ("Ada rolled a 4. Turn total: 4.") and friendly errors: invalid names or
  scores, server unreachable (with automatic re-sync), game not found, loading states with *Try again*.

## Rules (as implemented on the server)

Roll the die repeatedly: 2–6 add to your turn total, a **1** loses the turn total and passes the turn.
**Pass** banks the turn total (you must roll at least once first). First to reach the max score wins
(25–500, default 100).

## Security / anti-cheat notes

- Dice are rolled on the server with `crypto.randomInt`; the browser never sends a roll value.
- All input is validated server-side (names, avatars, scores, player count, difficulty, game ids).
- A per-game secret token authorises rolls/holds; rolls on one game are serialised by a database row lock.
- SQL uses parameterised queries only.
- Known limitation: players are identified by name (no passwords), so the leaderboard trusts names.

## Project layout

```
api/                 Vercel serverless functions (the backend)
  _lib/game.js       pure game rules + bot strategy (no DB, easy to test)
  _lib/repo.js       all SQL for games
  _lib/db.js         Postgres pool + automatic schema creation
  games/ ...         create / get / roll / hold / bot endpoints
  leaderboard.js, player.js
src/                 React frontend
  api/client.js      fetch wrapper with friendly errors
  routes/play_friends_live/LivePage.jsx   game controller (talks to the API)
tests/               unit + API integration tests
dev-server.js        runs the API locally
```

See `WALKTHROUGH.md` for a demo script and answers to likely questions.

## API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/health` | API + database check |
| POST | `/api/games` | Start a game (validated names, score and player count) |
| GET | `/api/games/:id` | Current state of a game |
| POST | `/api/games/:id/roll` | Server rolls the die for the current player |
| POST | `/api/games/:id/hold` | Bank the running points and pass the turn |
| POST | `/api/games/:id/bot` | Server plays the computer's whole turn and returns every step |
| GET | `/api/leaderboard` | Top 20 players by wins |
| GET | `/api/player?name=` | One player's stats and last 20 games |

Errors always look like `{ "error": { "code": "...", "message": "..." } }`.

## Tech

React 18 + Vite + Tailwind (frontend) · Vercel serverless functions in `/api` (backend) · PostgreSQL via `pg`.

## Run it locally

You need Node 20+ and any PostgreSQL database (local, Neon, Supabase…).

```bash
npm install
cp .env.example .env        # then put your DATABASE_URL in .env
npm run dev:all             # web on http://localhost:5173, API on http://localhost:3001
```

Tables are created automatically the first time the API runs.

Tests: `npm test` (set `DATABASE_URL` to also run the API integration tests).

## Deploy (Vercel)

1. Push this repo to GitHub and import it in Vercel (framework preset: Vite).
2. In the Vercel project: **Storage → Create Database → Neon (Postgres)** and connect it to the project.
   This adds `DATABASE_URL` for you.
3. Redeploy. Open `/api/health` on your live URL – it should say `"database": "connected"`.
