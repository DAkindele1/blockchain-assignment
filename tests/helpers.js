// Calls an API handler directly, without starting a server.
export async function call(handler, { method = "GET", query = {}, body, headers = {} } = {}) {
  const req = { method, query, headers, body };
  let status;
  let payload = "";
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(chunk) { status = this.statusCode; payload = chunk; },
  };
  await handler(req, res);
  return { status, json: payload ? JSON.parse(payload) : null };
}

// A die that returns the given values in order (for deterministic tests).
export function fixedRolls(...values) {
  let i = 0;
  return () => values[i++ % values.length];
}
