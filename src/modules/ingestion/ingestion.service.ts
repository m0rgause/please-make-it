/**
 * Ingestion module — Orchestration service.
 *
 * Thin wrapper that calls the module-specific ingest functions.
 * Exists to keep the controller clean and allow future batching/queueing logic.
 */

import { ingestPustakaFromSource } from "../pustaka/pustaka.service";
import { ingestChapterFromSource } from "../chapter/chapter.service";

/**
 * Trigger pustaka ingestion for a single page.
 */
export async function triggerPustakaIngest(
  page: number = 1,
  tipe: string = "",
  orderby: string = "date"
): Promise<{ upserted: number }> {
  return ingestPustakaFromSource(page, tipe, orderby);
}

/**
 * Trigger chapter ingestion (scrape → TG-S3 → DB).
 */
export async function triggerChapterIngest(slug: string): Promise<{
  slug: string;
  totalImages: number;
  storedImages: number;
}> {
  return ingestChapterFromSource(slug);
}
