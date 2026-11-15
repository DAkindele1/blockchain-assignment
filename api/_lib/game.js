// Pure game logic: no database, no HTTP. Everything that decides the outcome
// of a game (dice, scoring, bot decisions) lives here so it is easy to test
// and so the browser can never influence it.
import { randomInt } from "node:crypto";
import { HttpError } from "./http.js";

export const MIN_POINTS = 25;
export const MAX_POINTS = 500;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const AVATAR_COUNT = 29; // pig-0.png ... pig-28.png
export const MAX_NAME_LENGTH = 24;
export const MODES = ["friends", "bot"];
export const DIFFICULTIES = ["easy", "medium", "hard"];

// Cryptographically secure die roll, 1..6.
export function rollDie(rng = randomInt) {
  return rng(1, 7);
}

// ---------- validation ----------

export function cleanName(raw) {
  if (typeof raw !== "string") {
    throw new HttpError(400, "Player names must be text.", "BAD_NAME");
  }
  const name = raw
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "") // control characters
    .replace(/\s+/g, " ")
    .trim();
  if (name.length < 1 || name.length > MAX_NAME_LENGTH) {
    throw new HttpError(
      400,
      `Player names must be 1-${MAX_NAME_LENGTH} characters.`,
      "BAD_NAME"
    );
  }
  return name;
}

function cleanAvatar(raw, fallback) {
  if (raw === undefined || raw === null) return fallback;
  if (!Number.isInteger(raw) || raw < 0 || raw >= AVATAR_COUNT) {
    throw new HttpError(400, "Unknown avatar.", "BAD_AVATAR");
  }
  return raw;
}

export function botName(difficulty) {
  const label = difficulty[0].toUpperCase() + difficulty.slice(1);
  return `Computer (${label})`;
}

// Validates and normalises the body of POST /api/games.
export function validateNewGame(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Send a JSON object.", "BAD_BODY");
  }

  const mode = body.mode ?? "friends";
  if (!MODES.includes(mode)) {
    throw new HttpError(400, "Mode must be 'friends' or 'bot'.", "BAD_MODE");
  }

  const maxPoints = Number(body.maxPoints ?? 100);
  if (!Number.isInteger(maxPoints) || maxPoints < MIN_POINTS || maxPoints > MAX_POINTS) {
    throw new HttpError(
      400,
      `Max score must be a whole number from ${MIN_POINTS} to ${MAX_POINTS}.`,
      "BAD_MAX_POINTS"
    );
  }

  if (!Array.isArray(body.players)) {
    throw new HttpError(400, "players must be a list.", "BAD_PLAYERS");
  }

  let difficulty = null;
  if (mode === "bot") {
    difficulty = body.difficulty ?? "medium";
    if (!DIFFICULTIES.includes(difficulty)) {
      throw new HttpError(400, "Difficulty must be easy, medium or hard.", "BAD_DIFFICULTY");
    }
    if (body.players.length !== 1) {
      throw new HttpError(400, "Send exactly one human player when playing the computer.", "BAD_PLAYERS");
    }
  } else {
    const count = body.players.length;
    if (count < MIN_PLAYERS || count > MAX_PLAYERS) {
      throw new HttpError(
        400,
        `A game needs ${MIN_PLAYERS}-${MAX_PLAYERS} players.`,
        "BAD_PLAYERS"
      );
    }
  }

  const players = body.players.map((p, i) => {
    if (!p || typeof p !== "object") {
      throw new HttpError(400, "Each player must be an object.", "BAD_PLAYERS");
    }
    return { name: cleanName(p.name), avatar: cleanAvatar(p.avatar, i), isBot: false };
  });

  if (mode === "bot") {
    players.push({
      name: botName(difficulty),
      avatar: cleanAvatar(body.botAvatar, 5),
      isBot: true,
    });
  }

  const seen = new Set();
  for (const p of players) {
    const key = p.name.toLowerCase();
    if (seen.has(key)) {
      throw new HttpError(400, `Two players are both called "${p.name}". Give everyone a different name.`, "DUPLICATE_NAME");
    }
    seen.add(key);
  }

  return { mode, difficulty, maxPoints, players };
}

// ---------- game rules ----------
// state = { maxPoints, currentPlayer, status, winnerIndex, lastRoll,
//           players: [{ name, isBot, total, running }] }

export function newState({ maxPoints, players }) {
  return {
    maxPoints,
    currentPlayer: 0,
    status: "active",
    winnerIndex: null,
    lastRoll: 0,
    players: players.map((p) => ({ name: p.name, isBot: p.isBot, total: 0, running: 0 })),
  };
}

function assertActive(state) {
  if (state.status !== "active") {
    throw new HttpError(409, "This game is already over.", "GAME_OVER");
  }
}

// Apply one die roll for the current player. Returns { state, event }.
export function applyRoll(state, value) {
  assertActive(state);
  const s = structuredClone(state);
  const who = s.currentPlayer;
  const p = s.players[who];
  s.lastRoll = value;

  if (value === 1) {
    // Bust: lose this turn's points, next player.
    p.running = 0;
    s.currentPlayer = (who + 1) % s.players.length;
    return { state: s, event: { type: "bust", player: who, value } };
  }

  p.running += value;
  if (p.total + p.running >= s.maxPoints) {
    p.total += p.running;
    p.running = 0;
    s.status = "finished";
    s.winnerIndex = who;
    return { state: s, event: { type: "win", player: who, value } };
  }
  return { state: s, event: { type: "roll", player: who, value } };
}

// Current player banks their running points and the turn passes on.
export function applyHold(state) {
  assertActive(state);
  const s = structuredClone(state);
  const who = s.currentPlayer;
  const p = s.players[who];
  if (p.running === 0) {
    throw new HttpError(422, "Roll at least once before holding.", "NOTHING_TO_HOLD");
  }
  const banked = p.running;
  p.total += banked;
  p.running = 0;
  s.currentPlayer = (who + 1) % s.players.length;
  return { state: s, event: { type: "hold", player: who, banked } };
}

// ---------- computer opponent ----------
// Decides whether the bot should bank its points instead of rolling again.
// `rng(min, max)` returns an integer min..max-1 (injectable for tests).
export function botShouldHold(difficulty, state, rng = randomInt) {
  const me = state.players[state.currentPlayer];
  const running = me.running;
  if (running === 0) return false; // must roll at least once

  if (difficulty === "easy") {
    // Erratic: banks anywhere between 8 and 13 points, re-decided each roll.
    return running >= 8 + rng(0, 6);
  }
  if (difficulty === "medium") {
    return running >= 20; // classic "hold at 20" strategy
  }

  // hard: adapts to the score situation
  const remaining = state.maxPoints - (me.total + running);
  if (remaining <= 10) return false; // one or two rolls from winning: go for it
  const bestOpponent = Math.max(
    ...state.players.filter((_, i) => i !== state.currentPlayer).map((p) => p.total)
  );
  let threshold = 20;
  if (bestOpponent >= state.maxPoints - 25) threshold = 30; // they are close: take risks
  else if (me.total - bestOpponent >= 25) threshold = 15; // comfortably ahead: play safe
  return running >= threshold;
}

// Plays a whole bot turn. Returns the new state and every step so the browser
// can replay it with animation: [{ type, value?, running, banked? }].
export function playBotTurn(state, difficulty, rng = randomInt, roller = rollDie) {
  if (state.status !== "active" || !state.players[state.currentPlayer].isBot) {
    throw new HttpError(409, "It is not the computer's turn.", "NOT_BOT_TURN");
  }
  const who = state.currentPlayer;
  let current = state;
  const steps = [];
  const events = [];
  for (let i = 0; i < 100; i++) {
    const { state: afterRoll, event } = applyRoll(current, roller(rng));
    current = afterRoll;
    events.push(event);
    steps.push({ ...event, running: current.players[who].running });
    if (event.type !== "roll") break; // bust or win ends the turn
    if (botShouldHold(difficulty, current, rng)) {
      const { state: afterHold, event: holdEvent } = applyHold(current);
      current = afterHold;
      events.push(holdEvent);
      steps.push({ ...holdEvent, running: 0 });
      break;
    }
  }
  return { state: current, steps, events };
}
