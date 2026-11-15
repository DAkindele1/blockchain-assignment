import { route, parseGameId, HttpError } from "../../_lib/http.js";
import { withTransaction } from "../../_lib/db.js";
import { rollDie, applyRoll } from "../../_lib/game.js";
import { loadGame, toState, toPublic, assertToken, saveState } from "../../_lib/repo.js";

// POST /api/games/:id/roll - the SERVER rolls the die and applies the score.
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
      const value = rollDie();
      const { state: next, event } = applyRoll(state, value);
      await saveState(client, id, next, [event]);
      const fresh = await loadGame(client, id);
      return { roll: value, event, game: toPublic(fresh.game, fresh.playerRows) };
    });
    return { body };
  },
});
