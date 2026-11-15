import { route } from "./_lib/http.js";
import { query } from "./_lib/db.js";

// GET /api/health - quick check that the API and database are up.
export default route({
  async GET() {
    await query("SELECT 1");
    return { body: { ok: true, database: "connected" } };
  },
});
