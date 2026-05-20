import { Pool } from "pg";

import { ASSISTANT_DB_SCHEMA } from "@/lib/chat-persistence/types";
import { PROJECT_DB_SCHEMA } from "@/lib/project-persistence/types";

/**
 * Runs once when the Node server starts. Ensures app-owned Postgres schemas
 * exist so DDL from `db:push` can target stable qualified names (`<schema>.*`).
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
    for (const schemaName of [ASSISTANT_DB_SCHEMA, PROJECT_DB_SCHEMA]) {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    }
  } finally {
    await pool.end();
  }
}
