import { route, parseGameId } from "../../_lib/http.js";
import { withTransaction } from "../../_lib/db.js";
import { loadGame, toPublic } from "../../_lib/repo.js";

// GET /api/games/:id - current state of a game (read-only, no token needed).
export default route({
  async GET(req) {
    const id = parseGameId(req.query.id);
    const game = await withTransaction(async (client) => {
      const { game, playerRows } = await loadGame(client, id);
      return toPublic(game, playerRows);
    });
    return { body: { game } };
  },
});
