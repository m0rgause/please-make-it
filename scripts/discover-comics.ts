/**
 * Comic discovery orchestrator.
 *
 * Equivalent of Laravel's `UpdateTransaction` job:
 *   - Reads all comics from `pustaka_items`
 *   - Chunks them (like UserKartu.chunk(250))
 *   - For each comic, scrapes the detail page to get chapter slugs
 *   - Pushes chapter slugs to Redis queue:chapters (like ->onQueue('fetch-bsd'))
 *
 * The chapter worker (ingest-chapters.ts) BRPOP's from queue:chapters
 * and processes each one independently — same as a Laravel queue worker.
 *
 * Usage (called by schedule.ts):
 *   bun run discover:comics
 */

import { asc } from "drizzle-orm";
import { db } from "../src/core/database";
import { pustakaItems } from "../src/core/database/schema";
import { queue, QUEUES } from "../src/core/queue";
import { fetchPage } from "../src/core/fetcher";
import { buildComicDetailUrl } from "../src/utils/url";
import { parseComicDetail } from "../src/modules/comic/comic.parser";

// ─── Config ──────────────────────────────────────────────────

/** Chunk size per batch — like UserKartu.chunk(250) in UpdateTransaction */
const CHUNK_SIZE = 50;

/** Delay between each comic scrape request (respect komiku.org) */
const DELAY_MS = 300;

// ─── Graceful shutdown ───────────────────────────────────────

let running = true;

process.on("SIGTERM", () => {
  console.log("[discover:comics] SIGTERM — stopping after current chunk...");
  running = false;
});

process.on("SIGINT", () => {
  running = false;
});

// ─── Main ────────────────────────────────────────────────────

const started = Date.now();
console.log(`[discover:comics] Starting — chunk size: ${CHUNK_SIZE}`);

// Fetch all comic slugs from DB
const allSlugs = await db
  .select({ slug: pustakaItems.slug })
  .from(pustakaItems)
  .orderBy(asc(pustakaItems.id));

const total = allSlugs.length;
console.log(`[discover:comics] ${total} comics to process\n`);

let totalQueued  = 0;
let totalErrors  = 0;
let processed    = 0;
let chunkNumber  = 0;

// Process in chunks (like UpdateTransaction.chunk(250))
for (let i = 0; i < allSlugs.length && running; i += CHUNK_SIZE) {
  chunkNumber++;
  const chunk = allSlugs.slice(i, i + CHUNK_SIZE);

  console.log(
    `[discover:comics] Chunk ${chunkNumber} | comics ${i + 1}–${Math.min(i + CHUNK_SIZE, total)} of ${total}`
  );

  // Collect all chapter slugs for this chunk via scraping
  const chapterSlugsToQueue: string[] = [];

  for (const { slug } of chunk) {
    if (!running) break;

    try {
      const url  = buildComicDetailUrl(slug);
      const html = await fetchPage(url);
      const detail = parseComicDetail(html, slug);

      const slugs = detail.chapters.map((ch) => ch.slug).filter(Boolean);
      chapterSlugsToQueue.push(...slugs);
      processed++;
    } catch (err) {
      totalErrors++;
      const msg = err instanceof Error ? err.message : String(err);
      if (totalErrors <= 10 || totalErrors % 50 === 0) {
        console.warn(`[discover:comics] ⚠ ${slug}: ${msg.slice(0, 80)}`);
      }
    }

    await Bun.sleep(DELAY_MS);
  }

  // Push entire chunk's chapters to Redis in one pipeline (like dispatching batch jobs)
  if (chapterSlugsToQueue.length > 0) {
    await queue.pushMany(QUEUES.CHAPTERS, chapterSlugsToQueue);
    totalQueued += chapterSlugsToQueue.length;
    console.log(
      `[discover:comics] Chunk ${chunkNumber} → pushed ${chapterSlugsToQueue.length} chapters to Redis`
    );
  }
}

const queueLength = await queue.length(QUEUES.CHAPTERS);
const elapsed = Math.round((Date.now() - started) / 1000);

console.log(`\n[discover:comics] Finished in ${elapsed}s`);
console.log(`  Comics processed   : ${processed} / ${total}`);
console.log(`  Chapters queued    : ${totalQueued}`);
console.log(`  Queue depth now    : ${queueLength}`);
console.log(`  Errors             : ${totalErrors}`);

await queue.disconnect();
process.exit(0);
