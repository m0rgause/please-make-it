/**
 * Comic module — Business logic (service layer).
 *
 * Orchestrates: cache check → fetch → parse → cache store → return.
 * No access to Elysia Context — pure async functions.
 */

import { cache } from "../../core/cache";
import { fetchPage } from "../../core/fetcher";
import { NotFoundError } from "../../core/errors";
import { CACHE_TTL } from "../../config/app.config";
import { buildComicListUrl, buildComicDetailUrl } from "../../utils/url";
import {
  parseComicList,
  parseComicDetail,
  type ComicListParseResult,
} from "./comic.parser";
import type { ComicDetail } from "./comic.model";

/**
 * Get paginated comic list.
 *
 * @param page - Page number (1-indexed)
 * @returns Parsed comic list with pagination metadata
 */
export async function getComicList(
  page: number = 1
): Promise<ComicListParseResult> {
  const cacheKey = `comic:list:${page}`;

  // Check cache
  const cached = cache.get<ComicListParseResult>(cacheKey);
  if (cached) return cached;

  // Fetch & parse
  const url = buildComicListUrl(page);
  const html = await fetchPage(url);
  const result = parseComicList(html);

  if (result.comics.length === 0) {
    throw new NotFoundError(`No comics found on page ${page}`);
  }

  // Store in cache
  cache.set(cacheKey, result, CACHE_TTL.COMIC_LIST);

  return result;
}

/**
 * Get comic detail by slug.
 *
 * @param slug - URL slug of the comic (e.g., "komik-one-piece-indo")
 * @returns Full comic detail with chapters
 */
export async function getComicDetail(slug: string): Promise<ComicDetail> {
  const cacheKey = `comic:detail:${slug}`;

  // Check cache
  const cached = cache.get<ComicDetail>(cacheKey);
  if (cached) return cached;

  // Fetch & parse
  const url = buildComicDetailUrl(slug);
  const html = await fetchPage(url);
  const result = parseComicDetail(html, slug);

  if (!result.title) {
    throw new NotFoundError(`Comic not found: ${slug}`);
  }

  // Store in cache
  cache.set(cacheKey, result, CACHE_TTL.COMIC_DETAIL);

  return result;
}
