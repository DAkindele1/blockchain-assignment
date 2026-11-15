// Local development server for the /api routes (npm run dev:api).
// On Vercel the files in /api are deployed as serverless functions; this file
// just lets the exact same handlers run on your machine at http://localhost:3001.
import http from "node:http";
import { pathToFileURL } from "node:url";
import path from "node:path";

try {
  process.loadEnvFile(".env"); // DATABASE_URL etc. (Node 20.12+)
} catch {
  /* no .env file: rely on real environment variables */
}

const routes = [
  { re: /^\/api\/health$/, file: "api/health.js" },
  { re: /^\/api\/games$/, file: "api/games/index.js" },
  { re: /^\/api\/games\/([^/]+)$/, file: "api/games/[id]/index.js", params: ["id"] },
  { re: /^\/api\/games\/([^/]+)\/roll$/, file: "api/games/[id]/roll.js", params: ["id"] },
  { re: /^\/api\/games\/([^/]+)\/hold$/, file: "api/games/[id]/hold.js", params: ["id"] },
  { re: /^\/api\/games\/([^/]+)\/bot$/, file: "api/games/[id]/bot.js", params: ["id"] },
  { re: /^\/api\/leaderboard$/, file: "api/leaderboard.js" },
  { re: /^\/api\/player$/, file: "api/player.js" },
];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  for (const r of routes) {
    const match = url.pathname.match(r.re);
    if (!match) continue;
    req.query = Object.fromEntries(url.searchParams);
    (r.params || []).forEach((name, i) => (req.query[name] = decodeURIComponent(match[i + 1])));
    try {
      const mod = await import(pathToFileURL(path.resolve(r.file)).href);
      return await mod.default(req, res);
    } catch (err) {
      if (err.code === "ERR_MODULE_NOT_FOUND") break; // route not built yet
      console.error(err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: { code: "SERVER", message: "Dev server error." } }));
    }
  }
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "No such API route." } }));
});

const port = process.env.API_PORT || 3001;
server.listen(port, () => console.log(`API dev server on http://localhost:${port}`));
