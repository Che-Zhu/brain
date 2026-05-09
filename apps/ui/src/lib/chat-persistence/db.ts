import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { assistantChatMessages, assistantChats } from "./schema";

const POOL_MAX = 15;
const POOL_IDLE_MS = 30_000;
const POOL_CONN_TIMEOUT_MS = 5000;

const globalForPg = globalThis as unknown as { assistantChatPool?: Pool };

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is required for assistant chat persistence. Add DATABASE_URL (Postgres URL) to apps/ui/.env or apps/ui/.env.local, restart the dev server, and run drizzle db:push."
    );
  }
  return url;
}

function getPool(): Pool {
  if (globalForPg.assistantChatPool) {
    return globalForPg.assistantChatPool;
  }
  const pool = new Pool({
    connectionString: requireDatabaseUrl(),
    max: POOL_MAX,
    idleTimeoutMillis: POOL_IDLE_MS,
    connectionTimeoutMillis: POOL_CONN_TIMEOUT_MS,
  });
  globalForPg.assistantChatPool = pool;
  return pool;
}

export const assistantDb = drizzle(getPool(), {
  schema: { assistantChatMessages, assistantChats },
});
