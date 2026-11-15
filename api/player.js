import { route, HttpError } from "./_lib/http.js";
import { query } from "./_lib/db.js";
import { cleanName } from "./_lib/game.js";

// GET /api/player?name=Ada - one player's stats and their last 20 games.
export default route({
  async GET(req) {
    if (typeof req.query.name !== "string") {
      throw new HttpError(400, "Tell me which player to look up (?name=...).", "BAD_NAME");
    }
    const name = cleanName(req.query.name);

    const { rows: history } = await query(
      `SELECT g.id, g.finished_at, g.mode, g.difficulty, g.max_points,
              (g.winner_index = me.idx) AS won,
              me.name AS name, me.total_points AS score,
              (SELECT json_agg(json_build_object(
                        'name', o.name, 'score', o.total_points, 'isBot', o.is_bot)
                      ORDER BY o.idx)
                 FROM game_players o
                WHERE o.game_id = g.id AND o.idx <> me.idx) AS opponents
         FROM game_players me
         JOIN games g ON g.id = me.game_id
        WHERE lower(me.name) = lower($1) AND NOT me.is_bot AND g.status = 'finished'
        ORDER BY g.finished_at DESC
        LIMIT 20`,
      [name]
    );

    const { rows: [totals] } = await query(
      `SELECT count(*)::int AS games,
              count(*) FILTER (WHERE g.winner_index = me.idx)::int AS wins,
              count(*) FILTER (WHERE g.winner_index = me.idx AND g.mode = 'bot')::int AS bot_wins
         FROM game_players me
         JOIN games g ON g.id = me.game_id
        WHERE lower(me.name) = lower($1) AND NOT me.is_bot AND g.status = 'finished'`,
      [name]
    );
    if (totals.games === 0) {
      throw new HttpError(404, `No finished games found for "${name}".`, "NO_PLAYER");
    }

    let streak = 0; // current winning streak, newest game first
    for (const h of history) {
      if (!h.won) break;
      streak++;
    }

    return {
      body: {
        name: history[0].name,
        stats: {
          games: totals.games,
          wins: totals.wins,
          losses: totals.games - totals.wins,
          winRate: Math.round((totals.wins / totals.games) * 100),
          botWins: totals.bot_wins,
          winStreak: streak,
        },
        history: history.map((h) => ({
          gameId: h.id,
          finishedAt: h.finished_at,
          mode: h.mode,
          difficulty: h.difficulty,
          maxPoints: h.max_points,
          won: h.won,
          score: h.score,
          opponents: h.opponents || [],
        })),
      },
    };
  },
});
