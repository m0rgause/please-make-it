/**
 * Core — Redis queue client.
 *
 * Thin wrapper around ioredis for queue operations.
 * Uses Redis lists with LPUSH (enqueue) + BRPOP (blocking dequeue) —
 * the same pattern Laravel uses under the hood for its Redis queue driver.
 *
 * Queue names (equivalent to Laravel's ->onQueue('name')):
 *   queue:chapters   — chapter slugs to scrape + upload to TG-S3
 *   queue:pustaka    — (reserved, not currently used)
 *
 * Usage:
 *   import { queue } from "../../core/queue";
 *
 *   // Enqueue (like Job::dispatch()->onQueue('chapters'))
 *   await queue.push("queue:chapters", "one-piece-chapter-1");
 *
 *   // Dequeue — blocks until a job is available (like queue:work)
 *   const slug = await queue.pop("queue:chapters");
 *
 *   // Bulk enqueue
 *   await queue.pushMany("queue:chapters", ["slug-1", "slug-2"]);
 *
 *   // Queue length
 *   const pending = await queue.length("queue:chapters");
 */

import Redis from "ioredis";
import { env } from "../../config/env";

// ─── Queue names ─────────────────────────────────────────────

export const QUEUES = {
  CHAPTERS: "queue:chapters",
} as const;

// ─── Client ──────────────────────────────────────────────────

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,  // required for blocking commands
  lazyConnect: true,
});

redis.on("error", (err) => {
  // Don't crash the process on transient connection errors
  console.error("[queue] Redis error:", err.message);
});

// ─── Queue helpers ───────────────────────────────────────────

export const queue = {
  /**
   * Push one job onto the tail of a queue.
   * Equivalent: Job::dispatch()->onQueue('name')
   */
  async push(queueName: string, value: string): Promise<void> {
    await redis.rpush(queueName, value);
  },

  /**
   * Push many jobs at once (pipeline for performance).
   * Equivalent: dispatching a chunk of jobs in UpdateTransaction
   */
  async pushMany(queueName: string, values: string[]): Promise<void> {
    if (values.length === 0) return;
    // Pipeline all RPUSHes in one round-trip
    const pipeline = redis.pipeline();
    for (const v of values) {
      pipeline.rpush(queueName, v);
    }
    await pipeline.exec();
  },

  /**
   * Blocking pop — waits until a job is available, then returns it.
   * Equivalent: the queue worker's BRPOP loop (like queue:work)
   *
   * @param queueName - Queue to pop from
   * @param timeoutSecs - 0 = block forever, >0 = timeout in seconds
   * @returns The job value, or null on timeout
   */
  async pop(queueName: string, timeoutSecs = 5): Promise<string | null> {
    const result = await redis.blpop(queueName, timeoutSecs);
    return result ? result[1] ?? null : null;
  },

  /**
   * Current queue length (like checking queue size in Horizon).
   */
  async length(queueName: string): Promise<number> {
    return redis.llen(queueName);
  },

  /**
   * Gracefully close the Redis connection.
   * Call this before process.exit().
   */
  async disconnect(): Promise<void> {
    await redis.quit();
  },
};
