/**
 * Chapter module — Drizzle ORM repository.
 *
 * All database access for chapter detail and chapter images.
 * Services call these functions — no raw SQL outside this file.
 *
 * Tables: chapters, chapter_images
 */

import { eq, asc } from "drizzle-orm";
import { db } from "../../core/database";
import {
  chapters,
  chapterImages,
  type NewChapterRow,
  type NewChapterImageRow,
} from "../../core/database/schema";
import type { ChapterDetail, ChapterNav } from "./chapter.model";

// ─── Read ────────────────────────────────────────────────────

/**
 * Fetch a chapter detail from the database by slug.
 *
 * @param slug - Chapter slug (e.g. "one-piece-chapter-1179")
 * @returns Full ChapterDetail or null if not found
 */
export async function findBySlug(
  slug: string
): Promise<ChapterDetail | null> {
  const row = await db.query.chapters.findFirst({
    where: eq(chapters.slug, slug),
  });

  if (!row) return null;

  const images = await db
    .select({ storedUrl: chapterImages.storedUrl })
    .from(chapterImages)
    .where(eq(chapterImages.chapterSlug, slug))
    .orderBy(asc(chapterImages.position));

  return {
    slug:        row.slug,
    title:       row.title,
    series:      row.series,
    chapter:     row.chapter,
    comicUrl:    row.comicUrl,
    comicSlug:   row.comicSlug,
    totalImages: row.totalImages,
    prevChapter: (row.prevChapter as ChapterNav | null) ?? null,
    nextChapter: (row.nextChapter as ChapterNav | null) ?? null,
    images:      images.map((r) => r.storedUrl),
  };
}

// ─── Write ───────────────────────────────────────────────────

/**
 * Upsert a chapter and its stored image URLs.
 *
 * @param chapter      - ChapterDetail data (images field ignored — use storedImages)
 * @param storedImages - Ordered stored URLs from TG-S3
 */
export async function upsert(
  chapter: ChapterDetail,
  storedImages: string[]
): Promise<void> {
  const chapterRow: NewChapterRow = {
    slug:        chapter.slug,
    title:       chapter.title,
    series:      chapter.series,
    chapter:     chapter.chapter,
    comicUrl:    chapter.comicUrl,
    comicSlug:   chapter.comicSlug,
    totalImages: storedImages.length,
    prevChapter: chapter.prevChapter ?? null,
    nextChapter: chapter.nextChapter ?? null,
    scrapedAt:   new Date(),
  };

  await db
    .insert(chapters)
    .values(chapterRow)
    .onConflictDoUpdate({
      target: chapters.slug,
      set: {
        title:       chapterRow.title,
        series:      chapterRow.series,
        chapter:     chapterRow.chapter,
        comicUrl:    chapterRow.comicUrl,
        comicSlug:   chapterRow.comicSlug,
        totalImages: chapterRow.totalImages,
        prevChapter: chapterRow.prevChapter,
        nextChapter: chapterRow.nextChapter,
        scrapedAt:   chapterRow.scrapedAt,
      },
    });

  // Re-insert images — delete existing first (cascade handles nothing here since we delete manually)
  await db
    .delete(chapterImages)
    .where(eq(chapterImages.chapterSlug, chapter.slug));

  if (storedImages.length > 0) {
    const imageRows: NewChapterImageRow[] = storedImages.map((storedUrl, i) => ({
      chapterSlug: chapter.slug,
      position:    i,
      originalUrl: chapter.images[i] ?? "",
      storedUrl,
    }));

    await db.insert(chapterImages).values(imageRows);
  }
}
