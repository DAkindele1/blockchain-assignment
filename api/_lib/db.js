import pg from "pg";
import { HttpError } from "./http.js";
import { SCHEMA_SQL } from "./schema.js";

let pool;
let schemaReady;

// EDITED (1 of 3): pool settings and the advisory lock ID are now named
// constants. Same values (3, 10_000, 727274), same usage.
const POOL_MAX_CLIENTS = 3;
const POOL_IDLE_TIMEOUT_MS = 10_000;
const SCHEMA_LOCK_ID = 727274;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new HttpError(503, "The game database is not configured yet.", "NO_DATABASE");
    }
    // Small pool: serverless functions each hold their own.
    pool = new pg.Pool({
      connectionString,
      max: POOL_MAX_CLIENTS,
      idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
    });
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
        await client.query(`SELECT pg_advisory_xact_lock(${SCHEMA_LOCK_ID})`);
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

// EDITED (2 of 3): the repeated ROLLBACK-and-ignore-errors line is pulled
// into one helper. Same query, same swallowed rollback error.
async function safeRollback(client) {
  await client.query("ROLLBACK").catch(() => {});
}

export async function query(text, params) {
  await ensureSchema();
  return getPool().query(text, params);
}

// EDITED (3 of 3): withTransaction now uses safeRollback. Same flow:
// BEGIN, run fn, COMMIT, or ROLLBACK and rethrow, then always release.
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
    await safeRollback(client);
    throw err;
  } finally {
    client.release();
  }
}
