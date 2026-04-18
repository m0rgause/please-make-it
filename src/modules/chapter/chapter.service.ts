/**
 * Chapter module — Business logic (service layer).
 *
 * Orchestrates: cache check → fetch → parse → cache store → return.
 * No access to Elysia Context — pure async functions.
 */

import { cache } from "../../core/cache";
import { fetchPage } from "../../core/fetcher";
import { NotFoundError } from "../../core/errors";
import { CACHE_TTL } from "../../config/app.config";
import { buildChapterUrl } from "../../utils/url";
import { parseChapterDetail } from "./chapter.parser";
import type { ChapterDetail } from "./chapter.model";

/**
 * Get chapter detail by slug.
 *
 * @param slug - URL slug of the chapter (e.g., "one-piece-chapter-1179")
 * @returns Full chapter detail including image list and navigation
 */
export async function getChapterDetail(slug: string): Promise<ChapterDetail> {
  const cacheKey = `chapter:detail:${slug}`;

  // Check cache
  const cached = cache.get<ChapterDetail>(cacheKey);
  if (cached) return cached;

  // Fetch & parse
  const url = buildChapterUrl(slug);
  const html = await fetchPage(url);
  const result = parseChapterDetail(html, slug);

  if (!result.title || result.images.length === 0) {
    throw new NotFoundError(`Chapter not found: ${slug}`);
  }

  // Store in cache
  cache.set(cacheKey, result, CACHE_TTL.CHAPTER_DETAIL);

  return result;
}
