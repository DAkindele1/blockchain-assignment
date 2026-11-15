Add server-side game backend and wire the game to it (includes the base Greedy Pig import)

- Postgres schema (games, game_players, rolls) created automatically
- API: health, create game, get game, roll, hold with input validation
- Dice and scoring now run on the server (crypto.randomInt), per-game secret token,
  row locking against double requests, refresh-safe sessions
- Frontend: API client, server-synced controller, status banner, friendly errors
- Unit + integration tests, local dev server, Vercel config, README skeleton

