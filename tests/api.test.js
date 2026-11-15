// Integration tests
import test from "node:test";
import assert from "node:assert/strict";
import { call } from "./helpers.js";

const hasDb = Boolean(process.env.DATABASE_URL);
const opts = { skip: hasDb ? false : "DATABASE_URL not set" };

async function load() {
  const [health, games, game, roll, hold] = await Promise.all([
    import("../api/health.js"),
    import("../api/games/index.js"),
    import("../api/games/[id]/index.js"),
    import("../api/games/[id]/roll.js"),
    import("../api/games/[id]/hold.js"),
  ]);
  return {
    health: health.default, create: games.default, get: game.default,
    roll: roll.default, hold: hold.default,
  };
}

async function newGame(api, extra = {}) {
  const r = await call(api.create, {
    method: "POST",
    body: { maxPoints: 40, players: [{ name: "Ada" }, { name: "Bo" }], ...extra },
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return { id: r.json.game.id, token: r.json.token, game: r.json.game };
}

test("health reports the database is connected", opts, async () => {
  const api = await load();
  const r = await call(api.health);
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
});

test("create -> roll -> hold works end to end", opts, async () => {
  const api = await load();
  const { id, token, game } = await newGame(api);
  assert.equal(game.players.length, 2);
  assert.equal(game.currentPlayer, 0);
  assert.equal(game.status, "active");
  assert.equal("token" in game, false); // token never leaks via the game object

  const headers = { "x-game-token": token };
  let r = await call(api.roll, { method: "POST", query: { id }, headers });
  assert.equal(r.status, 200);
  assert.ok(r.json.roll >= 1 && r.json.roll <= 6);

  if (r.json.roll === 1) {
    assert.equal(r.json.game.currentPlayer, 1);
  } else {
    assert.equal(r.json.game.players[0].runningPoints, r.json.roll);
    r = await call(api.hold, { method: "POST", query: { id }, headers });
    assert.equal(r.status, 200);
    assert.equal(r.json.game.players[0].totalPoints > 0, true);
    assert.equal(r.json.game.currentPlayer, 1);
  }
  const g = await call(api.get, { query: { id } });
  assert.equal(g.status, 200);
});

test("rolling or holding without the right token is refused", opts, async () => {
  const api = await load();
  const { id } = await newGame(api);
  for (const handler of [api.roll, api.hold]) {
    let r = await call(handler, { method: "POST", query: { id } });
    assert.equal(r.status, 403);
    r = await call(handler, { method: "POST", query: { id }, headers: { "x-game-token": "nope" } });
    assert.equal(r.status, 403);
  }
});

test("bad ids, missing games and wrong methods give clean errors", opts, async () => {
  const api = await load();
  let r = await call(api.get, { query: { id: "not-a-uuid" } });
  assert.equal(r.status, 404);
  r = await call(api.get, { query: { id: "00000000-0000-4000-8000-000000000000" } });
  assert.equal(r.status, 404);
  r = await call(api.roll, { method: "GET", query: { id: "00000000-0000-4000-8000-000000000000" } });
  assert.equal(r.status, 405);
  r = await call(api.create, { method: "POST", body: { players: [{ name: "Only one" }] } });
  assert.equal(r.status, 400);
  assert.ok(r.json.error.message);
});

test("holding with nothing rolled is a 422 and changes nothing", opts, async () => {
  const api = await load();
  const { id, token } = await newGame(api);
  const r = await call(api.hold, { method: "POST", query: { id }, headers: { "x-game-token": token } });
  assert.equal(r.status, 422);
  const g = await call(api.get, { query: { id } });
  assert.equal(g.json.game.currentPlayer, 0);
});

test("a finished game refuses further moves", opts, async () => {
  const api = await load();
  const { id, token } = await newGame(api, { maxPoints: 25 });
  const headers = { "x-game-token": token };
  let last;
  for (let i = 0; i < 500; i++) {
    last = await call(api.roll, { method: "POST", query: { id }, headers });
    if (last.json?.game?.status === "finished") break;
  }
  assert.equal(last.json.game.status, "finished");
  assert.ok(last.json.game.winnerIndex === 0 || last.json.game.winnerIndex === 1);
  const again = await call(api.roll, { method: "POST", query: { id }, headers });
  assert.equal(again.status, 409);
});

test("simultaneous rolls are applied one at a time (no lost updates)", opts, async () => {
  const [{ query }, { applyRoll, newState }] = await Promise.all([
    import("../api/_lib/db.js"),
    import("../api/_lib/game.js"),
  ]);
  const api = await load();
  const { id, token } = await newGame(api, { maxPoints: 500 });
  const headers = { "x-game-token": token };
  const results = await Promise.all(
    Array.from({ length: 12 }, () => call(api.roll, { method: "POST", query: { id }, headers }))
  );
  assert.ok(results.every((r) => r.status === 200));

  // Replay every logged roll in order: the result must equal what is stored.
  const { rows } = await query("SELECT action, value FROM rolls WHERE game_id = $1 ORDER BY id", [id]);
  assert.equal(rows.length, 12);
  let replay = newState({ maxPoints: 500, players: [{ name: "Ada" }, { name: "Bo" }] });
  for (const row of rows) replay = applyRoll(replay, row.value).state;

  const stored = (await call(api.get, { query: { id } })).json.game;
  assert.equal(stored.currentPlayer, replay.currentPlayer);
  stored.players.forEach((p, i) => {
    assert.equal(p.totalPoints, replay.players[i].total);
    assert.equal(p.runningPoints, replay.players[i].running);
  });
});

test("vs computer: server plays the bot turn and blocks cheating", opts, async () => {
  const api = await load();
  const botMod = (await import("../api/games/[id]/bot.js")).default;
  const created = await call(api.create, {
    method: "POST",
    body: { mode: "bot", difficulty: "medium", maxPoints: 100, players: [{ name: "Ada" }] },
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const { id } = created.json.game;
  const headers = { "x-game-token": created.json.token };
  assert.equal(created.json.game.players[1].isBot, true);

  // Bot can't be asked to play during the human's turn.
  let r = await call(botMod, { method: "POST", query: { id }, headers });
  assert.equal(r.status, 409);

  // Human rolls until the turn passes to the computer.
  for (let i = 0; i < 100; i++) {
    r = await call(api.roll, { method: "POST", query: { id }, headers });
    if (r.json.game.currentPlayer === 1 || r.json.game.status === "finished") break;
    if (r.json.game.players[0].runningPoints >= 6) {
      r = await call(api.hold, { method: "POST", query: { id }, headers });
      break;
    }
  }
  assert.equal(r.json.game.currentPlayer, 1);

  // Human can't roll or hold for the computer.
  for (const handler of [api.roll, api.hold]) {
    const bad = await call(handler, { method: "POST", query: { id }, headers });
    assert.equal(bad.status, 409);
  }
  // Wrong token can't trigger the bot.
  const noToken = await call(botMod, { method: "POST", query: { id }, headers: { "x-game-token": "x" } });
  assert.equal(noToken.status, 403);

  const bot = await call(botMod, { method: "POST", query: { id }, headers });
  assert.equal(bot.status, 200);
  assert.ok(bot.json.steps.length >= 1);
  assert.ok(["bust", "hold", "win"].includes(bot.json.steps.at(-1).type));
  assert.equal(bot.json.game.currentPlayer, bot.json.game.status === "finished" ? 1 : 0);
});

async function playToTheEnd(api, id, token) {
  const headers = { "x-game-token": token };
  const botMod = (await import("../api/games/[id]/bot.js")).default;
  for (let i = 0; i < 2000; i++) {
    const g = (await call(api.get, { query: { id } })).json.game;
    if (g.status === "finished") return g;
    const r = g.players[g.currentPlayer].isBot
      ? await call(botMod, { method: "POST", query: { id }, headers })
      : await call(api.roll, { method: "POST", query: { id }, headers });
    assert.equal(r.status, 200);
  }
  throw new Error("game never finished");
}

test("leaderboard and player history reflect finished games", opts, async () => {
  const api = await load();
  const board = (await import("../api/leaderboard.js")).default;
  const player = (await import("../api/player.js")).default;
  const name = `Tester${Date.now() % 100000}`;

  // Unknown player -> clean 404, missing/invalid name -> 400
  assert.equal((await call(player, { query: { name } })).status, 404);
  assert.equal((await call(player, { query: {} })).status, 400);
  assert.equal((await call(player, { query: { name: "   " } })).status, 400);

  // Play two complete games vs the computer
  for (let n = 0; n < 2; n++) {
    const created = await call(api.create, {
      method: "POST",
      body: { mode: "bot", difficulty: "easy", maxPoints: 25, players: [{ name }] },
    });
    await playToTheEnd(api, created.json.game.id, created.json.token);
  }
  // An unfinished game must not count
  await call(api.create, { method: "POST", body: { mode: "bot", maxPoints: 25, players: [{ name }] } });

  const p = await call(player, { query: { name: name.toLowerCase() } }); // case-insensitive
  assert.equal(p.status, 200);
  assert.equal(p.json.stats.games, 2);
  assert.equal(p.json.stats.wins + p.json.stats.losses, 2);
  assert.equal(p.json.history.length, 2);
  assert.equal(p.json.history[0].opponents[0].isBot, true);
  assert.equal(p.json.history[0].opponents[0].name, "Computer (Easy)");
  assert.equal(p.json.stats.winRate, Math.round((p.json.stats.wins / 2) * 100));

  const lb = await call(board);
  assert.equal(lb.status, 200);
  const row = lb.json.players.find((r) => r.name === name);
  // The board is limited to the top 20, so only check the row if present.
  if (row) {
    assert.equal(row.games, 2);
    assert.equal(row.wins, p.json.stats.wins);
  }
  assert.ok(lb.json.players.every((r, i) => r.rank === i + 1));
  assert.ok(lb.json.players.every((r) => r.name !== "Computer (Easy)"), "bots are never ranked");
});
