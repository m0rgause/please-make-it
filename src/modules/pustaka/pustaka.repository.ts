/**
 * Pustaka module — Drizzle ORM repository.
 *
 * All database access for the pustaka (recently updated) comic list.
 * Services call these functions — no raw SQL outside this file.
 *
 * Table: pustaka_items
 */

import { eq, sql, desc, ilike } from "drizzle-orm";
import { db } from "../../core/database";
import { pustakaItems, type NewPustakaItemRow } from "../../core/database/schema";
import type { PustakaItem } from "./pustaka.model";

// ─── Read ────────────────────────────────────────────────────

/**
 * Fetch a paginated list of pustaka items from the database.
 *
 * @param page    - 1-indexed page number
 * @param perPage - Items per page
 * @param tipe    - Optional type filter: "manga" | "manhwa" | "manhua" | ""
 * @param orderby - "updated_at" (default) | "scraped_at"
 */
export async function findAll(
  page: number = 1,
  perPage: number = 12,
  tipe: string = "",
  orderby: string = "updated_at"
): Promise<PustakaItem[]> {
  const offset = (page - 1) * perPage;
  const orderCol = orderby === "scraped_at"
    ? pustakaItems.scrapedAt
    : pustakaItems.updatedAt;

  const rows = await db
    .select()
    .from(pustakaItems)
    .where(tipe ? ilike(pustakaItems.type, tipe) : undefined)
    .orderBy(desc(orderCol))
    .limit(perPage)
    .offset(offset);

  return rows.map(rowToItem);
}

/**
 * Count total pustaka items (optionally filtered by type).
 */
export async function count(tipe: string = ""): Promise<number> {
  const result = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(pustakaItems)
    .where(tipe ? ilike(pustakaItems.type, tipe) : undefined);

  return result[0]?.count ?? 0;
}

// ─── Write ───────────────────────────────────────────────────

/**
 * Upsert many pustaka items.
 * ON CONFLICT (id) updates all mutable fields.
 */
export async function upsertMany(items: PustakaItem[]): Promise<void> {
  if (items.length === 0) return;

  const rows: NewPustakaItemRow[] = items.map((it) => ({
    id:        it.id,
    title:     it.title,
    slug:      it.slug,
    url:       it.url,
    type:      it.type,
    genres:    it.genres,
    status:    it.status,
    updatedAt: it.updatedAt,
    scrapedAt: new Date(),
  }));

  await db
    .insert(pustakaItems)
    .values(rows)
    .onConflictDoUpdate({
      target: pustakaItems.id,
      set: {
        title:     sql`EXCLUDED.title`,
        slug:      sql`EXCLUDED.slug`,
        url:       sql`EXCLUDED.url`,
        type:      sql`EXCLUDED.type`,
        genres:    sql`EXCLUDED.genres`,
        status:    sql`EXCLUDED.status`,
        updatedAt: sql`EXCLUDED.updated_at`,
        scrapedAt: sql`EXCLUDED.scraped_at`,
      },
    });
}

// ─── Mapper ──────────────────────────────────────────────────

function rowToItem(row: typeof pustakaItems.$inferSelect): PustakaItem {
  return {
    id:        row.id,
    title:     row.title,
    slug:      row.slug,
    url:       row.url,
    type:      row.type,
    genres:    row.genres ?? [],
    status:    row.status,
    updatedAt: row.updatedAt,
  };
}
