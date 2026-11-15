// All SQL for games lives here, so route files stay short.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.js";

export function createToken() {
  return randomBytes(24).toString("hex");
}

export async function insertGame(client, { mode, difficulty, maxPoints, players }) {
  const token = createToken();
  const { rows } = await client.query(
    `INSERT INTO games (token, mode, difficulty, max_points)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [token, mode, difficulty, maxPoints]
  );
  const id = rows[0].id;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    await client.query(
      `INSERT INTO game_players (game_id, idx, name, avatar, is_bot)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, i, p.name, p.avatar, p.isBot]
    );
  }
  return { id, token };
}

// Loads a game and its players. With lock = true the row is locked until the
// transaction ends, so two rapid requests can never both act on old state.
export async function loadGame(client, id, { lock = false } = {}) {
  const { rows } = await client.query(
    `SELECT * FROM games WHERE id = $1 ${lock ? "FOR UPDATE" : ""}`,
    [id]
  );
  if (rows.length === 0) throw new HttpError(404, "Game not found.", "NOT_FOUND");
  const game = rows[0];
  const { rows: playerRows } = await client.query(
    `SELECT idx, name, avatar, is_bot, total_points, running_points
       FROM game_players WHERE game_id = $1 ORDER BY idx`,
    [id]
  );
  return { game, playerRows };
}

export function toState(game, playerRows) {
  return {
    maxPoints: game.max_points,
    currentPlayer: game.current_player,
    status: game.status,
    winnerIndex: game.winner_index,
    lastRoll: game.last_roll,
    players: playerRows.map((p) => ({
      name: p.name,
      isBot: p.is_bot,
      total: p.total_points,
      running: p.running_points,
    })),
  };
}

export function toPublic(game, playerRows) {
  return {
    id: game.id,
    mode: game.mode,
    difficulty: game.difficulty,
    maxPoints: game.max_points,
    status: game.status,
    currentPlayer: game.current_player,
    winnerIndex: game.winner_index,
    lastRoll: game.last_roll,
    players: playerRows.map((p) => ({
      index: p.idx,
      name: p.name,
      avatar: p.avatar,
      isBot: p.is_bot,
      totalPoints: p.total_points,
      runningPoints: p.running_points,
    })),
  };
}

// Only the player who created the game holds the token, so nobody else can
// roll or hold in it.
export function assertToken(req, game) {
  const sent = String(req.headers["x-game-token"] || "");
  const a = Buffer.from(sent);
  const b = Buffer.from(game.token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new HttpError(403, "You are not allowed to play in this game.", "BAD_TOKEN");
  }
}

// Writes new scores/turn to the database and logs the events that happened.
export async function saveState(client, id, state, events) {
  await client.query(
    `UPDATE games
        SET current_player = $2, status = $3, winner_index = $4, last_roll = $5,
            finished_at = CASE WHEN $3 = 'finished' THEN now() ELSE finished_at END
      WHERE id = $1`,
    [id, state.currentPlayer, state.status, state.winnerIndex, state.lastRoll]
  );
  await client.query(
    `UPDATE game_players gp
        SET total_points = v.total, running_points = v.running
       FROM unnest($2::int[], $3::int[], $4::int[]) AS v(idx, total, running)
      WHERE gp.game_id = $1 AND gp.idx = v.idx`,
    [
      id,
      state.players.map((_, i) => i),
      state.players.map((p) => p.total),
      state.players.map((p) => p.running),
    ]
  );
  for (const e of events) {
    await client.query(
      `INSERT INTO rolls (game_id, player_idx, action, value) VALUES ($1, $2, $3, $4)`,
      [id, e.player, e.type, e.type === "hold" ? null : e.value]
    );
  }
}

