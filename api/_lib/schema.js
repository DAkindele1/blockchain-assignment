// Database schema. It is applied automatically (once per server start) by
// ensureSchema() in db.js, and every statement is safe to run repeatedly.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS games (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token          TEXT NOT NULL,
  mode           TEXT NOT NULL CHECK (mode IN ('friends', 'bot')),
  difficulty     TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  max_points     INT  NOT NULL CHECK (max_points BETWEEN 25 AND 500),
  current_player INT  NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  winner_index   INT,
  last_roll      INT  NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS game_players (
  game_id        UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  idx            INT  NOT NULL,
  name           TEXT NOT NULL,
  avatar         INT  NOT NULL DEFAULT 0,
  is_bot         BOOLEAN NOT NULL DEFAULT false,
  total_points   INT  NOT NULL DEFAULT 0,
  running_points INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, idx)
);

-- Every roll / bust / hold, in order: the full history of each game.
CREATE TABLE IF NOT EXISTS rolls (
  id         BIGSERIAL PRIMARY KEY,
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_idx INT  NOT NULL,
  action     TEXT NOT NULL CHECK (action IN ('roll', 'bust', 'win', 'hold')),
  value      INT  CHECK (value IS NULL OR value BETWEEN 1 AND 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rolls_game_idx ON rolls (game_id, id);
CREATE INDEX IF NOT EXISTS game_players_name_idx ON game_players (lower(name));
`;
