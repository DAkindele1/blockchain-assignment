import { route, parseGameId, HttpError } from "../../_lib/http.js";
import { withTransaction } from "../../_lib/db.js";
import { applyHold } from "../../_lib/game.js";
import { loadGame, toState, toPublic, assertToken, saveState } from "../../_lib/repo.js";

// POST /api/games/:id/hold - bank the running points and pass the turn.
export default route({
  async POST(req) {
    const id = parseGameId(req.query.id);
    const body = await withTransaction(async (client) => {
      const { game, playerRows } = await loadGame(client, id, { lock: true });
      assertToken(req, game);
      const state = toState(game, playerRows);
      if (state.status === "active" && state.players[state.currentPlayer].isBot) {
        throw new HttpError(409, "It is the computer's turn.", "NOT_YOUR_TURN");
      }
      const { state: next, event } = applyHold(state);
      await saveState(client, id, next, [event]);
      const fresh = await loadGame(client, id);
      return { event, game: toPublic(fresh.game, fresh.playerRows) };
    });
    return { body };
  },
});
