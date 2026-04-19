/**
 * Pustaka ingestion job.
 *
 * Equivalent of `FetchTransactionBSD` in the PHP backend:
 * a single-run job that fetches all pages from the WP REST API
 * and upserts them into `pustaka_items`.
 *
 * Triggered by `schedule.ts` on each cycle — NOT a continuous loop.
 * The scheduler controls how often this runs.
 *
 * Usage:
 *   bun run ingest:pustaka        ← called by schedule.ts
 *   bun run ingest:pustaka        ← or manually for a one-off sync
 */

import { ingestPustakaFromSource } from "../src/modules/pustaka/pustaka.service";

// ─── Config ──────────────────────────────────────────────────

/** Max attempts per page before skipping (like $tries = 3) */
const MAX_TRIES = 3;

/** Backoff in ms per attempt (like $backoff = [10, 30, 60]) */
const BACKOFF_MS = [10_000, 30_000, 60_000] as const;

/** Delay between page requests — respect WP REST API */
const DELAY_MS = 500;

// ─── Graceful shutdown ───────────────────────────────────────

let running = true;

process.on("SIGTERM", () => {
  console.log("[ingest:pustaka] SIGTERM — stopping after current page...");
  running = false;
});

process.on("SIGINT", () => {
  running = false;
});

// ─── Main ────────────────────────────────────────────────────

const started = Date.now();
console.log("[ingest:pustaka] Starting pustaka sync");

let page = 1;
let totalUpserted = 0;
let totalErrors = 0;
let pagesProcessed = 0;

// Page through the entire WP REST API until we get an empty page
while (running) {
  let succeeded = false;
  let lastError: string | null = null;

  // Retry loop per page (like $tries = 3, $backoff = [10, 30, 60])
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    if (attempt > 0) {
      const backoff = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS.at(-1)!;
      console.warn(`[ingest:pustaka] ⚠ Page ${page} retry ${attempt + 1}/${MAX_TRIES} — waiting ${backoff / 1000}s`);
      await Bun.sleep(backoff);
    }

    try {
      const result = await ingestPustakaFromSource(page, "", "date");
      totalUpserted += result.upserted;
      pagesProcessed++;
      succeeded = true;

      // Empty page = past the end of the catalogue
      if (result.upserted === 0) {
        console.log(`[ingest:pustaka] End of catalogue at page ${page}`);
        running = false; // exit outer while
      }

      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (!succeeded) {
    totalErrors++;
    console.error(`[ingest:pustaka] ❌ Page ${page} skipped after ${MAX_TRIES} attempts: ${lastError?.slice(0, 80)}`);
  }

  if (running) {
    page++;
    await Bun.sleep(DELAY_MS);
  }
}

const elapsed = Math.round((Date.now() - started) / 1000);
console.log(`\n[ingest:pustaka] Done in ${elapsed}s`);
console.log(`  Pages     : ${pagesProcessed}`);
console.log(`  Upserted  : ${totalUpserted}`);
console.log(`  Errors    : ${totalErrors}`);

process.exit(0);
