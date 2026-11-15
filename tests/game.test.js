import test from "node:test";
import assert from "node:assert/strict";
import {
  rollDie, applyRoll, applyHold, newState, validateNewGame, cleanName,
} from "../api/_lib/game.js";

const two = () =>
  newState({
    maxPoints: 50,
    players: [
      { name: "Eno", isBot: false },
      { name: "Segun", isBot: false },
      { name: "David", isBot: false },
    ],
  });

test("rollDie only returns 1..6 and uses every face", () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const v = rollDie();
    assert.ok(Number.isInteger(v) && v >= 1 && v <= 6);
    seen.add(v);
  }
  assert.equal(seen.size, 6);
});

test("rolling 2-6 adds to the running points and keeps the turn", () => {
  const { state, event } = applyRoll(two(), 4);
  assert.equal(state.players[0].running, 4);
  assert.equal(state.currentPlayer, 0);
  assert.equal(event.type, "roll");
});

test("rolling a 1 wipes running points and passes the turn", () => {
  let s = applyRoll(two(), 6).state;
  const { state, event } = applyRoll(s, 1);
  assert.equal(state.players[0].running, 0);
  assert.equal(state.players[0].total, 0);
  assert.equal(state.currentPlayer, 1);
  assert.equal(event.type, "bust");
});

test("hold banks the points and passes the turn", () => {
  let s = applyRoll(two(), 6).state;
  s = applyRoll(s, 5).state;
  const { state, event } = applyHold(s);
  assert.equal(state.players[0].total, 11);
  assert.equal(state.players[0].running, 0);
  assert.equal(state.currentPlayer, 1);
  assert.deepEqual(event, { type: "hold", player: 0, banked: 11 });
});

test("holding before rolling is rejected", () => {
  assert.throws(() => applyHold(two()), (e) => e.status === 422);
});

test("reaching the max score wins immediately", () => {
  let s = two();
  for (let i = 0; i < 8; i++) s = applyRoll(s, 6).state; // 48
  assert.equal(s.status, "active");
  const { state, event } = applyRoll(s, 2); // 50
  assert.equal(state.status, "finished");
  assert.equal(state.winnerIndex, 0);
  assert.equal(state.players[0].total, 50);
  assert.equal(event.type, "win");
});

test("nothing can be played after the game is over", () => {
  let s = two();
  for (let i = 0; i < 9; i++) s = applyRoll(s, 6).state;
  assert.equal(s.status, "finished");
  assert.throws(() => applyRoll(s, 3), (e) => e.status === 409);
  assert.throws(() => applyHold(s), (e) => e.status === 409);
});

test("applyRoll does not mutate the state it was given", () => {
  const before = two();
  const copy = structuredClone(before);
  applyRoll(before, 5);
  assert.deepEqual(before, copy);
});

test("cleanName trims, collapses spaces and strips control characters", () => {
  assert.equal(cleanName("  Ada \n  Lovelace\u0007 "), "Ada Lovelace");
  assert.throws(() => cleanName("   "));
  assert.throws(() => cleanName("x".repeat(25)));
  assert.throws(() => cleanName(42));
});

test("validateNewGame accepts a good friends game", () => {
  const g = validateNewGame({
    maxPoints: "60",
    players: [{ name: "Ada", avatar: 3 }, { name: "Bo" }],
  });
  assert.equal(g.mode, "friends");
  assert.equal(g.maxPoints, 60);
  assert.equal(g.players.length, 2);
  assert.equal(g.players[1].avatar, 1);
});

test("validateNewGame rejects bad input", () => {
  const ok = [{ name: "A" }, { name: "B" }];
  const bad = [
    null,
    [],
    { players: "nope" },
    { players: [{ name: "Solo" }] },
    { players: Array.from({ length: 9 }, (_, i) => ({ name: `P${i}` })) },
    { maxPoints: 24, players: ok },
    { maxPoints: 501, players: ok },
    { maxPoints: 99.5, players: ok },
    { maxPoints: "abc", players: ok },
    { mode: "chess", players: ok },
    { players: [{ name: "A", avatar: 99 }, { name: "B" }] },
    { players: [{ name: "Same" }, { name: "same" }] },
    { players: [{ name: "" }, { name: "B" }] },
  ];
  for (const body of bad) {
    assert.throws(() => validateNewGame(body), (e) => e.status === 400, JSON.stringify(body));
  }
});

// ---------- bot controls ----------
import { botShouldHold, playBotTurn } from "../api/_lib/game.js";
import { fixedRolls } from "./helpers.js";

const vsBot = (maxPoints = 100) =>
  newState({ maxPoints, players: [{ name: "Ada", isBot: false }, { name: "Computer", isBot: true }] });

function botTurnState(running, total = 0, oppTotal = 0, maxPoints = 100) {
  const s = vsBot(maxPoints);
  s.currentPlayer = 1;
  s.players[1].running = running;
  s.players[1].total = total;
  s.players[0].total = oppTotal;
  return s;
}

test("bot never holds with nothing rolled", () => {
  for (const d of ["easy", "medium", "hard"]) {
    assert.equal(botShouldHold(d, botTurnState(0)), false);
  }
});

test("medium bot holds at 20 and not before", () => {
  assert.equal(botShouldHold("medium", botTurnState(19)), false);
  assert.equal(botShouldHold("medium", botTurnState(20)), true);
});

test("easy bot holds between 8 and 13 depending on its random pick", () => {
  assert.equal(botShouldHold("easy", botTurnState(8), () => 0), true);
  assert.equal(botShouldHold("easy", botTurnState(12), () => 5), false);
  assert.equal(botShouldHold("easy", botTurnState(13), () => 5), true);
});

test("hard bot takes more risk when the opponent is close to winning", () => {
  assert.equal(botShouldHold("hard", botTurnState(22, 0, 10)), true);
  assert.equal(botShouldHold("hard", botTurnState(22, 0, 80)), false);
  assert.equal(botShouldHold("hard", botTurnState(30, 0, 80)), true);
});

test("hard bot plays safe when well ahead and keeps rolling near the win", () => {
  assert.equal(botShouldHold("hard", botTurnState(15, 50, 10)), true);
  assert.equal(botShouldHold("hard", botTurnState(15, 60, 10, 100)), true);
  assert.equal(botShouldHold("hard", botTurnState(15, 75, 10, 100)), false); // 10 from winning
});

test("a bot turn ends with a hold once the threshold is reached", () => {
  // medium: rolls 6,6,6,2 = 20 -> holds
  const { state, steps } = playBotTurn(botTurnState(0), "medium", undefined, fixedRolls(6, 6, 6, 2));
  assert.deepEqual(steps.map((s) => s.type), ["roll", "roll", "roll", "roll", "hold"]);
  assert.equal(state.players[1].total, 20);
  assert.equal(state.currentPlayer, 0);
});

test("a bot turn ends at once when it rolls a 1", () => {
  const { state, steps } = playBotTurn(botTurnState(0), "medium", undefined, fixedRolls(5, 1));
  assert.deepEqual(steps.map((s) => s.type), ["roll", "bust"]);
  assert.equal(state.players[1].total, 0);
  assert.equal(state.currentPlayer, 0);
});

test("a bot can win the game", () => {
  const { state, steps } = playBotTurn(botTurnState(0, 90), "hard", undefined, fixedRolls(6, 4));
  assert.equal(steps.at(-1).type, "win");
  assert.equal(state.status, "finished");
  assert.equal(state.winnerIndex, 1);
});

test("playBotTurn refuses when it is a human's turn", () => {
  assert.throws(() => playBotTurn(vsBot(), "easy"), (e) => e.status === 409);
});

test("every difficulty always finishes a turn with real dice", () => {
  for (const d of ["easy", "medium", "hard"]) {
    for (let i = 0; i < 300; i++) {
      const { state } = playBotTurn(botTurnState(0), d);
      assert.ok(state.currentPlayer === 0 || state.status === "finished");
    }
  }
});

test("validateNewGame builds the bot opponent", () => {
  const g = validateNewGame({ mode: "bot", difficulty: "hard", players: [{ name: "Ada" }] });
  assert.equal(g.players.length, 2);
  assert.deepEqual(
    [g.players[1].isBot, g.players[1].name, g.difficulty],
    [true, "Computer (Hard)", "hard"]
  );
  assert.throws(() => validateNewGame({ mode: "bot", difficulty: "insane", players: [{ name: "A" }] }));
  assert.throws(() => validateNewGame({ mode: "bot", players: [{ name: "A" }, { name: "B" }] }));
});
