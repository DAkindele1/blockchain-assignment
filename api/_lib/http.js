// Small HTTP helpers shared by every API route.
// They use only plain Node `req`/`res` features, so the same handlers run on
// Vercel (serverless) and in dev-server.js (local).

export class HttpError extends Error {
  constructor(status, message, code = "ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

const MAX_BODY_BYTES = 10 * 1024;

// Vercel pre-parses JSON bodies into req.body. Locally we read the stream.
export async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        throw new HttpError(400, "Request body is not valid JSON.", "BAD_JSON");
      }
    }
    return req.body;
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, "Request body is too large.", "TOO_LARGE");
    }
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Request body is not valid JSON.", "BAD_JSON");
  }
}

// route({ GET: fn, POST: fn }) -> (req, res) handler with method checking
// and uniform error responses: { error: { code, message } }
export function route(methods) {
  return async function handler(req, res) {
    try {
      const fn = methods[req.method];
      if (!fn) {
        res.setHeader("Allow", Object.keys(methods).join(", "));
        throw new HttpError(405, `Method ${req.method} not allowed.`, "METHOD");
      }
      const { status = 200, body } = await fn(req);
      sendJson(res, status, body);
    } catch (err) {
      if (err instanceof HttpError) {
        sendJson(res, err.status, {
          error: { code: err.code, message: err.message },
        });
      } else {
        console.error("Unhandled API error:", err);
        sendJson(res, 500, {
          error: { code: "SERVER", message: "Something went wrong on the server." },
        });
      }
    }
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseGameId(value) {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new HttpError(404, "Game not found.", "NOT_FOUND");
  }
  return value.toLowerCase();
}
