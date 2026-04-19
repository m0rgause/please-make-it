/**
 * Chapter module — Business logic (service layer).
 *
 * DB-primary architecture:
 *   READ path  → cache → PostgreSQL → NotFoundError (no fallback scrape)
 *   INGEST path → komiku.org scrape → parse → TG-S3 upload → upsert DB → invalidate cache
 *
 * Scraping NEVER happens in the read path.
 */

import { cache } from "../../core/cache";
import { fetchPage } from "../../core/fetcher";
import { NotFoundError } from "../../core/errors";
import { CACHE_TTL } from "../../config/app.config";
import { buildChapterUrl } from "../../utils/url";
import { parseChapterDetail } from "./chapter.parser";
import { findBySlug, upsert } from "./chapter.repository";
import { downloadAndStoreChapterImages } from "../../core/storage/image-pipeline";
import type { ChapterDetail } from "./chapter.model";

// ─── Read (DB-primary) ────────────────────────────────────────

/**
 * Get chapter detail by slug from PostgreSQL.
 * Throws NotFoundError if the chapter has not been ingested yet.
 *
 * @param slug - Chapter slug (e.g. "one-piece-chapter-1179")
 */
export async function getChapterDetail(slug: string): Promise<ChapterDetail> {
  const cacheKey = `chapter:detail:${slug}`;

  const cached = cache.get<ChapterDetail>(cacheKey);
  if (cached) return cached;

  const row = await findBySlug(slug);
  if (!row) {
    throw new NotFoundError(`Chapter not found: ${slug}`);
  }

  cache.set(cacheKey, row, CACHE_TTL.CHAPTER_DETAIL);
  return row;
}

// ─── Ingest (scrape → TG-S3 → DB) ────────────────────────────

/**
 * Scrape a chapter from komiku.org, store images in TG-S3, persist to DB.
 * Invalidates the chapter cache key after upsert.
 *
 * @param slug - Chapter slug to ingest
 * @returns Ingestion result metadata
 */
export async function ingestChapterFromSource(slug: string): Promise<{
  slug: string;
  totalImages: number;
  storedImages: number;
}> {
  const url = buildChapterUrl(slug);
  const html = await fetchPage(url);
  const chapter = parseChapterDetail(html, slug);

  if (!chapter.title || chapter.images.length === 0) {
    throw new NotFoundError(`Chapter not found on source: ${slug}`);
  }

  // Upload images to TG-S3, skip already-stored ones
  const storedUrls = await downloadAndStoreChapterImages(chapter.images, slug);

  // Persist to DB with stored URLs
  await upsert(chapter, storedUrls);

  // Invalidate cache
  cache.delete(`chapter:detail:${slug}`);

  return {
    slug,
    totalImages: chapter.images.length,
    storedImages: storedUrls.length,
  };
}
