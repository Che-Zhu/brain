import { Pool } from "pg";

import { ASSISTANT_DB_SCHEMA } from "@/lib/chat-persistence/types";

/**
 * Runs once when the Node server starts. Ensures the Postgres schema used by assistant chat
 * exists so DDL from `db:push` can target stable qualified names (`<schema>.*`).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return;
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${ASSISTANT_DB_SCHEMA}"`);
  } finally {
    await pool.end();
  }
}
