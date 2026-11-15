const BASE = import.meta.env.VITE_API_URL || "";
const TIMEOUT_MS = 10000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = "ERROR", network = false } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.network = network;
  }
}

async function request(path, { method = "GET", body, token } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "x-game-token": token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(
      err.name === "AbortError"
        ? "The server took too long to answer. Please try again."
        : "Can't reach the game server. Check your internet connection and try again.",
      { network: true }
    );
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    throw new ApiError(
      data?.error?.message || `The server had a problem (error ${res.status}). Please try again.`,
      { status: res.status, code: data?.error?.code }
    );
  }
  return data;
}

export const api = {
  createGame: (payload) => request("/api/games", { method: "POST", body: payload }),
  getGame: (id) => request(`/api/games/${id}`),
  roll: (id, token) => request(`/api/games/${id}/roll`, { method: "POST", token }),
  hold: (id, token) => request(`/api/games/${id}/hold`, { method: "POST", token }),
  leaderboard: () => request("/api/leaderboard"),
  player: (name) => request(`/api/player?name=${encodeURIComponent(name)}`),
  botTurn: (id, token) => request(`/api/games/${id}/bot`, { method: "POST", token }),
};
