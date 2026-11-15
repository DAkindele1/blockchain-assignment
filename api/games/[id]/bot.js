import { route, parseGameId } from "../../_lib/http.js";
import { withTransaction } from "../../_lib/db.js";
import { playBotTurn } from "../../_lib/game.js";
import { loadGame, toState, toPublic, assertToken, saveState } from "../../_lib/repo.js";

// POST /api/games/:id/bot - the server plays the computer's whole turn.
// Returns every step (so the browser can animate it) and the final game.
export default route({
  async POST(req) {
    const id = parseGameId(req.query.id);
    const body = await withTransaction(async (client) => {
      const { game, playerRows } = await loadGame(client, id, { lock: true });
      assertToken(req, game);
      const { state, steps, events } = playBotTurn(toState(game, playerRows), game.difficulty);
      await saveState(client, id, state, events);
      const fresh = await loadGame(client, id);
      return { steps, game: toPublic(fresh.game, fresh.playerRows) };
    });
    return { body };
  },
});
