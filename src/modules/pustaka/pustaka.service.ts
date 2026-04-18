/**
 * Pustaka module — Business logic (service layer).
 *
 * Fetches the recently-updated comic list from the Komiku WordPress REST API.
 * Orchestrates: cache check → fetch → parse → cache store → return.
 * No access to Elysia Context — pure async functions.
 *
 * Pagination metadata is read from the WP REST response headers:
 *   X-WP-Total      → total number of items
 *   X-WP-TotalPages → total number of pages
 */

import { cache } from "../../core/cache";
import { fetchJson } from "../../core/fetcher";
import { NotFoundError } from "../../core/errors";
import { CACHE_TTL } from "../../config/app.config";
import { buildPustakaUrl } from "../../utils/url";
import { parsePustakaList, type PustakaParseResult } from "./pustaka.parser";

/**
 * Get the recently-updated comic list from the WP REST API.
 *
 * @param page    - Page number (1-indexed)
 * @param tipe    - Optional type filter: "manga" | "manhwa" | "manhua" | ""
 * @param orderby - Sort order: "date" (default) | "modified"
 * @returns Parsed list with pagination metadata
 */
export async function getPustakaList(
  page: number = 1,
  tipe: string = "",
  orderby: string = "date"
): Promise<PustakaParseResult> {
  const cacheKey = `pustaka:list:${page}:${tipe}:${orderby}`;

  // Check cache
  const cached = cache.get<PustakaParseResult>(cacheKey);
  if (cached) return cached;

  // Fetch from WP REST API
  const url = buildPustakaUrl(page, tipe, orderby);
  const { data, headers } = await fetchJson(url);

  // WP REST exposes pagination in response headers
  const totalPages = parseInt(headers.get("X-WP-TotalPages") ?? "1", 10) || 1;

  const result = parsePustakaList(data, page, totalPages);

  if (result.items.length === 0) {
    throw new NotFoundError(`No comics found on page ${page}`);
  }

  // Store in cache
  cache.set(cacheKey, result, CACHE_TTL.PUSTAKA_LIST);

  return result;
}
