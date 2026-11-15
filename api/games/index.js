import { route, readJson } from "../_lib/http.js";
import { withTransaction } from "../_lib/db.js";
import { validateNewGame } from "../_lib/game.js";
import { insertGame, loadGame, toPublic } from "../_lib/repo.js";

// POST /api/games - start a new game.
// Body: { mode, maxPoints, players: [{ name, avatar }], difficulty? }
// Responds with the game plus a secret token the browser must send back
// (x-game-token header) for every roll/hold.
export default route({
  async POST(req) {
    const input = validateNewGame(await readJson(req));
    const body = await withTransaction(async (client) => {
      const { id, token } = await insertGame(client, input);
      const { game, playerRows } = await loadGame(client, id);
      return { token, game: toPublic(game, playerRows) };
    });
    return { status: 201, body };
  },
});
