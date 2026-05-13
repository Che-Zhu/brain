import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

/** Run from `apps/ui`: `bun run db:push` */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/chat-persistence/schema.ts",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  out: "./drizzle",
  /** Only reconcile `pgSchema('sealai_assistant')` — avoids drizzle trying to DROP `public` objects (e.g. `postgres_log`) on managed PG. */
  schemaFilter: ["sealai_assistant"],
  tablesFilter: [
    "!pg_auth_mon",
    "!pg_stat_kcache",
    "!pg_stat_kcache_detail",
    "!pg_stat_statements",
    "!pg_stat_statements_info",
    "!postgres_log",
  ],
});
