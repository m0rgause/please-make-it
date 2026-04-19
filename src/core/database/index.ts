/**
 * Database — Drizzle ORM connection singleton.
 *
 * Uses `postgres` (pg driver) + `drizzle-orm/postgres-js`.
 * Exports `db` — the Drizzle instance used for all queries.
 *
 * Usage:
 *   import { db } from "../../core/database";
 *   import { pustakaItems } from "../../core/database/schema";
 *   const rows = await db.select().from(pustakaItems).limit(10);
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { env } from "../../config/env";
import { DATABASE } from "../../config/app.config";

const client = postgres(env.DATABASE_URL, {
  max: DATABASE.MAX_CONNECTIONS,
  idle_timeout: 30,
  connect_timeout: 10,
});

/** Drizzle ORM instance — shared across the application */
export const db = drizzle(client, { schema });
