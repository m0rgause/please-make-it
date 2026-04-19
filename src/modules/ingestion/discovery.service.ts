/**
 * Ingestion module — Chapter discovery & queue processing service.
 *
 * Discovery: scrapes a comic detail page, extracts all chapter slugs,
 * and inserts them into `chapter_queue` (skipping already-queued slugs).
 *
 * Queue processing: picks the next N pending rows from `chapter_queue`,
 * runs full chapter ingest (scrape → TG-S3 → DB), and marks them done.
 */

import { eq, sql, and } from "drizzle-orm";
import { db } from "../../core/database";
import { chapterQueue } from "../../core/database/schema";
import { fetchPage } from "../../core/fetcher";
import { NotFoundError } from "../../core/errors";
import { buildComicDetailUrl } from "../../utils/url";
import { parseComicDetail } from "../comic/comic.parser";
import { ingestChapterFromSource } from "../chapter/chapter.service";
import type { NewChapterQueueRow } from "../../core/database/schema";

// ─── Discovery ────────────────────────────────────────────────

/**
 * Scrape a comic's detail page, collect all chapter slugs, and insert
 * them into `chapter_queue` (ON CONFLICT DO NOTHING — idempotent).
 *
 * @param comicSlug - Comic slug from pustaka_items (e.g. "one-piece-indo")
 * @returns Number of new chapter slugs queued
 */
export async function discoverChapters(
  comicSlug: string
): Promise<{ discovered: number }> {
  const url = buildComicDetailUrl(comicSlug);
  const html = await fetchPage(url);
  const detail = parseComicDetail(html, comicSlug);

  if (!detail.title || detail.chapters.length === 0) {
    throw new NotFoundError(`Comic not found or has no chapters: ${comicSlug}`);
  }

  const rows: NewChapterQueueRow[] = detail.chapters.map((ch) => ({
    chapterSlug:  ch.slug,
    comicSlug,
    title:        ch.title,
    date:         ch.date,
    ingested:     false,
    discoveredAt: new Date(),
    ingestedAt:   null,
  }));

  // Bulk insert — skip already-queued slugs
  const result = await db
    .insert(chapterQueue)
    .values(rows)
    .onConflictDoNothing({ target: chapterQueue.chapterSlug });

  return { discovered: rows.length };
}

// ─── Queue Processing ─────────────────────────────────────────

/**
 * Process the next `limit` pending items in `chapter_queue`.
 * Each item goes through: scrape chapter → upload images to TG-S3 → save to DB.
 *
 * @param limit - Max chapters to process in this batch (default 10)
 * @returns Stats for this batch run
 */
export async function processChapterQueue(
  limit: number = 10
): Promise<{ processed: number; failed: number }> {
  // Fetch next pending batch
  const pending = await db
    .select({ chapterSlug: chapterQueue.chapterSlug })
    .from(chapterQueue)
    .where(eq(chapterQueue.ingested, false))
    .limit(limit);

  let processed = 0;
  let failed = 0;

  for (const { chapterSlug } of pending) {
    try {
      await ingestChapterFromSource(chapterSlug);

      // Mark as done
      await db
        .update(chapterQueue)
        .set({ ingested: true, ingestedAt: new Date() })
        .where(eq(chapterQueue.chapterSlug, chapterSlug));

      processed++;
    } catch {
      // Mark failures silently — they stay pending and can be retried
      failed++;
    }
  }

  return { processed, failed };
}

// ─── Queue Stats ──────────────────────────────────────────────

/**
 * Return current queue counts for monitoring.
 */
export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  ingested: number;
}> {
  const rows = await db
    .select({
      total:    sql<number>`COUNT(*)::int`,
      pending:  sql<number>`COUNT(*) FILTER (WHERE ingested = false)::int`,
      ingested: sql<number>`COUNT(*) FILTER (WHERE ingested = true)::int`,
    })
    .from(chapterQueue);

  return rows[0] ?? { total: 0, pending: 0, ingested: 0 };
}
