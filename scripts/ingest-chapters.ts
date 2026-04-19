/**
 * Chapter ingestion worker.
 *
 * Equivalent of Laravel's `FetchTransaction` / `FetchTransactionBSD` jobs:
 *   - BRPOP's from Redis `queue:chapters` (blocking — no polling/sleep needed)
 *   - Scrapes chapter from komiku.org
 *   - Uploads images to TG-S3
 *   - Persists to PostgreSQL (chapters + chapter_images tables)
 *
 * Retry pattern (like $tries = 3, $backoff = [10, 30, 60]):
 *   On failure, re-pushes the slug back to the tail of the queue with
 *   an incremented attempt counter tracked in Redis hash.
 *
 * Usage:
 *   bun run ingest:chapters
 *
 * supervisord config:
 *   [program:ingest-chapters]
 *   command=bun run ingest:chapters
 *   directory=/path/to/diary
 *   autostart=true
 *   autorestart=true
 *   stopwaitsecs=30
 *
 * Scale horizontally by running multiple instances:
 *   numprocs=3
 *   process_name=%(program_name)s_%(process_num)02d
 */

import { queue, QUEUES } from "../src/core/queue";
import { ingestChapterFromSource } from "../src/modules/chapter/chapter.service";
import Redis from "ioredis";
import { env } from "../src/config/env";

// ─── Config ──────────────────────────────────────────────────

/** Max attempts before permanently dropping a job (like $tries = 3) */
const MAX_TRIES = 3;

/** Backoff delays in ms (like $backoff = [10, 30, 60]) */
const BACKOFF_MS = [10_000, 30_000, 60_000] as const;

/** Throttle between requests — respect komiku.org */
const DELAY_MS = 1_500;

/** Redis hash that tracks attempt counts per chapter slug */
const ATTEMPTS_KEY = "queue:chapters:attempts";

// ─── Clients ─────────────────────────────────────────────────

// Separate Redis client for BLPOP (cannot share with the queue client
// while it's in blocking mode)
const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on("error", (err) => {
  console.error("[ingest:chapters] Redis error:", err.message);
});

// ─── State ───────────────────────────────────────────────────

let running = true;
let totalProcessed = 0;
let totalFailed = 0;
let totalDropped = 0;

// ─── Graceful shutdown ───────────────────────────────────────

process.on("SIGTERM", () => {
  console.log("[ingest:chapters] SIGTERM — finishing current job then stopping...");
  running = false;
});

process.on("SIGINT", () => {
  running = false;
});

// ─── Helpers ─────────────────────────────────────────────────

async function getAttempts(slug: string): Promise<number> {
  const val = await redis.hget(ATTEMPTS_KEY, slug);
  return val ? parseInt(val, 10) : 0;
}

async function incrementAttempts(slug: string): Promise<number> {
  return redis.hincrby(ATTEMPTS_KEY, slug, 1);
}

async function clearAttempts(slug: string): Promise<void> {
  await redis.hdel(ATTEMPTS_KEY, slug);
}

// ─── Main loop ───────────────────────────────────────────────

console.log(`[ingest:chapters] Chapter ingestion worker started`);
console.log(`  MAX_TRIES : ${MAX_TRIES}`);
console.log(`  BACKOFF   : ${BACKOFF_MS.map((ms) => ms / 1000 + "s").join(", ")}`);
console.log(`  DELAY     : ${DELAY_MS}ms between requests`);
console.log(`  Queue     : ${QUEUES.CHAPTERS}\n`);

while (running) {
  // BLPOP — blocks up to 5s, returns null on timeout (allows SIGTERM check)
  const slug = await queue.pop(QUEUES.CHAPTERS, 5);

  if (!slug) {
    // Timeout (queue empty) — loop back and check running flag
    continue;
  }

  const attempts = await getAttempts(slug);

  try {
    await ingestChapterFromSource(slug);

    // ✅ Success
    await clearAttempts(slug);
    totalProcessed++;

    const total = totalProcessed + totalFailed + totalDropped;
    if (total % 100 === 0) {
      const pending = await queue.length(QUEUES.CHAPTERS);
      console.log(
        `[ingest:chapters] ✅ ${totalProcessed} done | ⚠ ${totalFailed} retried | ❌ ${totalDropped} dropped | 📦 ${pending} pending`
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const newAttempts = await incrementAttempts(slug);

    if (newAttempts >= MAX_TRIES) {
      // Permanently drop — like markAsFailed() (could log to a dead-letter set)
      await redis.sadd("queue:chapters:failed", slug);
      await clearAttempts(slug);
      totalDropped++;
      console.error(
        `[ingest:chapters] ❌ DROPPED after ${newAttempts} attempts: ${slug.slice(0, 60)} — ${message.slice(0, 80)}`
      );
    } else {
      // Re-queue with backoff (like $backoff = [10, 30, 60])
      const backoff = BACKOFF_MS[newAttempts - 1] ?? BACKOFF_MS.at(-1)!;
      totalFailed++;
      console.warn(
        `[ingest:chapters] ⚠ Attempt ${newAttempts}/${MAX_TRIES} failed — requeing in ${backoff / 1000}s: ${message.slice(0, 60)}`
      );

      // Sleep backoff, then push back to tail of queue
      await Bun.sleep(backoff);
      await queue.push(QUEUES.CHAPTERS, slug);
    }
  }

  if (running) await Bun.sleep(DELAY_MS);
}

// Cleanup
await queue.disconnect();
await redis.quit();

console.log(`\n[ingest:chapters] Stopped.`);
console.log(`  Processed : ${totalProcessed}`);
console.log(`  Retried   : ${totalFailed}`);
console.log(`  Dropped   : ${totalDropped}`);
process.exit(0);
