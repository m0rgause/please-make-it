/**
 * Ingestion module — Elysia controller (private routes).
 *
 * All routes are protected with `X-Ingest-Key` header authentication.
 *
 * Routes:
 *   POST /api/ingest/pustaka                — ingest a pustaka page from WP REST API
 *   POST /api/ingest/chapter/:slug          — scrape a chapter + upload images to TG-S3
 *   POST /api/ingest/comic/:slug/discover   — scrape comic detail, queue all chapter slugs
 *   POST /api/ingest/queue/process          — process next N items from chapter_queue
 *   GET  /api/ingest/queue/stats            — chapter_queue progress stats
 */

import { Elysia, t } from "elysia";
import { env } from "../../config/env";
import { BadRequestError } from "../../core/errors";
import { ok } from "../../core/response";
import { triggerPustakaIngest, triggerChapterIngest } from "./ingestion.service";
import {
  discoverChapters,
  processChapterQueue,
  getQueueStats,
} from "./discovery.service";

/** Query params for the pustaka ingest endpoint */
const IngestPustakaQuerySchema = t.Object({
  page:    t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  tipe:    t.Optional(t.Union([t.Literal("manga"), t.Literal("manhwa"), t.Literal("manhua"), t.Literal("")])),
  orderby: t.Optional(t.Union([t.Literal("date"), t.Literal("modified")])),
});

/** Path params for the chapter ingest endpoint */
const IngestChapterParamsSchema = t.Object({
  slug: t.String({ minLength: 1, pattern: "^[a-z0-9-]+$" }),
});

/** Path params for the comic discover endpoint */
const IngestComicParamsSchema = t.Object({
  slug: t.String({ minLength: 1, pattern: "^[a-z0-9-]+$" }),
});

/** Query params for queue processing */
const ProcessQueueQuerySchema = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 10 })),
});

export const ingestionModule = new Elysia({ prefix: "/ingest" })

  /**
   * Authenticate every /ingest/* request via X-Ingest-Key header.
   */
  .derive(({ headers }) => {
    const key = headers["x-ingest-key"] ?? "";
    if (key !== env.INGEST_API_KEY) {
      throw new BadRequestError("Invalid or missing X-Ingest-Key");
    }
    return {};
  })

  /**
   * POST /api/ingest/pustaka
   */
  .post(
    "/pustaka",
    async ({ query }) => {
      const result = await triggerPustakaIngest(
        query.page ?? 1,
        query.tipe ?? "",
        query.orderby ?? "date"
      );
      return ok(result);
    },
    {
      query: IngestPustakaQuerySchema,
      detail: { summary: "Ingest pustaka page", tags: ["Ingestion"] },
    }
  )

  /**
   * POST /api/ingest/chapter/:slug
   */
  .post(
    "/chapter/:slug",
    async ({ params }) => {
      const result = await triggerChapterIngest(params.slug);
      return ok(result);
    },
    {
      params: IngestChapterParamsSchema,
      detail: { summary: "Ingest chapter (scrape + TG-S3)", tags: ["Ingestion"] },
    }
  )

  /**
   * POST /api/ingest/comic/:slug/discover
   * Scrapes the comic detail page and queues all chapter slugs.
   */
  .post(
    "/comic/:slug/discover",
    async ({ params }) => {
      const result = await discoverChapters(params.slug);
      return ok(result);
    },
    {
      params: IngestComicParamsSchema,
      detail: {
        summary: "Discover comic chapters",
        description: "Scrape a comic detail page and queue all its chapter slugs for ingestion.",
        tags: ["Ingestion"],
      },
    }
  )

  /**
   * POST /api/ingest/queue/process
   * Process next N pending chapters from chapter_queue.
   */
  .post(
    "/queue/process",
    async ({ query }) => {
      const result = await processChapterQueue(query.limit ?? 10);
      return ok(result);
    },
    {
      query: ProcessQueueQuerySchema,
      detail: {
        summary: "Process chapter queue",
        description: "Process the next N pending chapters from chapter_queue (scrape + TG-S3 upload).",
        tags: ["Ingestion"],
      },
    }
  )

  /**
   * GET /api/ingest/queue/stats
   * Current queue progress.
   */
  .get(
    "/queue/stats",
    async () => {
      const stats = await getQueueStats();
      return ok(stats);
    },
    {
      detail: {
        summary: "Queue stats",
        description: "Returns total, pending, and ingested chapter counts from chapter_queue.",
        tags: ["Ingestion"],
      },
    }
  );
