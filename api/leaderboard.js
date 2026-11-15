import { route } from "./_lib/http.js";
import { query } from "./_lib/db.js";

// GET /api/leaderboard - top 20 human players by wins, from finished games.
export default route({
  async GET() {
    const { rows } = await query(
      `SELECT name, games, wins, bot_wins FROM (
         SELECT (array_agg(gp.name ORDER BY g.finished_at DESC))[1] AS name,
                count(*)::int AS games,
                count(*) FILTER (WHERE g.winner_index = gp.idx)::int AS wins,
                count(*) FILTER (WHERE g.winner_index = gp.idx AND g.mode = 'bot')::int AS bot_wins
           FROM game_players gp
           JOIN games g ON g.id = gp.game_id
          WHERE g.status = 'finished' AND NOT gp.is_bot
          GROUP BY lower(gp.name)
       ) t
       ORDER BY wins DESC, wins::float / games DESC, games DESC, name
       LIMIT 20`
    );
    const players = rows.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      games: r.games,
      wins: r.wins,
      botWins: r.bot_wins,
      winRate: Math.round((r.wins / r.games) * 100),
    }));
    return { body: { players } };
  },
});
