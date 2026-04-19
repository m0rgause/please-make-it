/**
 * Pustaka module — Business logic (service layer).
 *
 * DB-primary architecture:
 *   READ path  → cache → PostgreSQL → return
 *   INGEST path → WP REST API → parse → upsert DB → invalidate cache
 *
 * Scraping NEVER happens in the read path.
 */

import { cache } from "../../core/cache";
import { fetchJson } from "../../core/fetcher";
import { NotFoundError } from "../../core/errors";
import { CACHE_TTL } from "../../config/app.config";
import { buildPustakaUrl } from "../../utils/url";
import { parsePustakaList } from "./pustaka.parser";
import { findAll, count, upsertMany } from "./pustaka.repository";
import type { PustakaParseResult } from "./pustaka.parser";

const PER_PAGE = 12;

// ─── Read (DB-primary) ────────────────────────────────────────

/**
 * Get the recently-updated comic list from PostgreSQL.
 *
 * @param page    - Page number (1-indexed)
 * @param tipe    - Optional type filter: "manga" | "manhwa" | "manhua" | ""
 * @param orderby - Sort order: "date" (default) | "modified"
 */
export async function getPustakaList(
  page: number = 1,
  tipe: string = "",
  orderby: string = "date"
): Promise<PustakaParseResult> {
  const cacheKey = `pustaka:list:${page}:${tipe}:${orderby}`;

  const cached = cache.get<PustakaParseResult>(cacheKey);
  if (cached) return cached;

  const dbOrderby = orderby === "modified" ? "scraped_at" : "updated_at";
  const [items, total] = await Promise.all([
    findAll(page, PER_PAGE, tipe, dbOrderby),
    count(tipe),
  ]);

  if (items.length === 0) {
    throw new NotFoundError(`No comics found on page ${page}`);
  }

  const totalPages = Math.ceil(total / PER_PAGE);
  const result: PustakaParseResult = { items, currentPage: page, totalPages };

  cache.set(cacheKey, result, CACHE_TTL.PUSTAKA_LIST);
  return result;
}

// ─── Ingest (scrape → DB) ─────────────────────────────────────

/**
 * Scrape one page from the WP REST API and persist into PostgreSQL.
 * Invalidates related cache keys after upsert.
 *
 * @param page    - Page number to ingest
 * @param tipe    - Optional type filter
 * @param orderby - WP REST sort (passed through to API)
 * @returns Count of items upserted
 */
export async function ingestPustakaFromSource(
  page: number = 1,
  tipe: string = "",
  orderby: string = "date"
): Promise<{ upserted: number }> {
  const url = buildPustakaUrl(page, tipe, orderby);
  const { data, headers } = await fetchJson(url);
  const totalPages = parseInt(headers.get("X-WP-TotalPages") ?? "1", 10) || 1;

  const { items } = parsePustakaList(data, page, totalPages);

  await upsertMany(items);

  // Invalidate cache for affected keys
  for (let p = 1; p <= totalPages; p++) {
    cache.delete(`pustaka:list:${p}:${tipe}:${orderby}`);
  }

  return { upserted: items.length };
}
