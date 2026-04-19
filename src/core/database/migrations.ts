/**
 * Database — Schema migrations via drizzle-kit.
 *
 * `runMigrations()` applies all pending SQL migrations from the
 * `drizzle/` folder at server startup. Migration files are generated
 * by `bun run db:generate` (drizzle-kit generate).
 *
 * This is idempotent — drizzle tracks applied migrations in the
 * `__drizzle_migrations` table automatically.
 */

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./index";

/**
 * Apply all pending database migrations.
 * Called once at server startup (src/index.ts).
 */
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: "./drizzle" });
}
