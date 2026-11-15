import pg from "pg";
import { HttpError } from "./http.js";
import { SCHEMA_SQL } from "./schema.js";

let pool;
let schemaReady;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new HttpError(503, "The game database is not configured yet.", "NO_DATABASE");
    }
    // Small pool: serverless functions each hold their own.
    pool = new pg.Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000 });
    pool.on("error", (err) => console.error("Idle database client error:", err));
  }
  return pool;
}

// Creates the tables the first time any route runs. The advisory lock stops
// two cold-starting functions from creating them at the same moment.
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(727274)");
        await client.query(SCHEMA_SQL);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    })().catch((err) => {
      schemaReady = undefined; // try again on the next request
      throw err;
    });
  }
  return schemaReady;
}

export async function query(text, params) {
  await ensureSchema();
  return getPool().query(text, params);
}

// Runs fn inside a transaction; rolls back if it throws.
export async function withTransaction(fn) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
