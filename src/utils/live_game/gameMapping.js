// Converts the server's game object into the playerData shape the UI components use.
export function toPlayerData(game, pigs) {
  return game.players.map((p) => ({
    id: `${game.id}-${p.index}`,
    avatar: pigs[p.avatar],
    tag: p.name,
    name: p.name,
    pig_index: p.avatar,
    running_points: p.runningPoints,
    total_points: p.totalPoints,
    is_bot: p.isBot,
  }));
}

const SESSION_KEY = "greedyPig.session";

// The browser remembers which game it is playing (and its secret token) so a page refresh does not lose the game.
export function readSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (s && typeof s.id === "string" && typeof s.token === "string") return s;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode etc. */
  }
}
