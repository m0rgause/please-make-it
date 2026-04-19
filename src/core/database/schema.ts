/**
 * Database — Drizzle ORM schema definitions.
 *
 * Single source of truth for all table structures.
 * Types are inferred directly from the schema — no duplication.
 *
 * Tables:
 *   pustaka_items   — recently-updated comic list (from WP REST API)
 *   chapters        — chapter detail metadata
 *   chapter_images  — ordered per-chapter images stored in TG-S3
 */

import {
  pgTable,
  integer,
  text,
  timestamp,
  primaryKey,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ─── pustaka_items ────────────────────────────────────────────

export const pustakaItems = pgTable("pustaka_items", {
  id:        integer("id").primaryKey(),
  title:     text("title").notNull(),
  slug:      text("slug").notNull().unique(),
  url:       text("url").notNull(),
  type:      text("type").notNull(),
  genres:    text("genres").array().notNull(),
  status:    text("status").notNull(),
  updatedAt: text("updated_at").notNull(),
  scrapedAt: timestamp("scraped_at", { withTimezone: true })
               .notNull()
               .defaultNow(),
});

export type PustakaItemRow    = InferSelectModel<typeof pustakaItems>;
export type NewPustakaItemRow = InferInsertModel<typeof pustakaItems>;

// ─── chapters ─────────────────────────────────────────────────

export const chapters = pgTable("chapters", {
  slug:        text("slug").primaryKey(),
  title:       text("title").notNull(),
  series:      text("series").notNull(),
  chapter:     text("chapter").notNull(),
  comicUrl:    text("comic_url").notNull(),
  comicSlug:   text("comic_slug").notNull(),
  totalImages: integer("total_images").notNull(),
  prevChapter: jsonb("prev_chapter"),
  nextChapter: jsonb("next_chapter"),
  scrapedAt:   timestamp("scraped_at", { withTimezone: true })
                 .notNull()
                 .defaultNow(),
});

export type ChapterRow    = InferSelectModel<typeof chapters>;
export type NewChapterRow = InferInsertModel<typeof chapters>;

// ─── chapter_images ───────────────────────────────────────────

export const chapterImages = pgTable(
  "chapter_images",
  {
    chapterSlug: text("chapter_slug")
                   .notNull()
                   .references(() => chapters.slug, { onDelete: "cascade" }),
    position:    integer("position").notNull(),
    originalUrl: text("original_url").notNull(),
    storedUrl:   text("stored_url").notNull(),
  },
  (table) => [primaryKey({ columns: [table.chapterSlug, table.position] })]
);

export type ChapterImageRow    = InferSelectModel<typeof chapterImages>;
export type NewChapterImageRow = InferInsertModel<typeof chapterImages>;

// ─── chapter_queue ────────────────────────────────────────────

/**
 * Discovery queue for chapter ingestion.
 *
 * Populated by the comic discovery step (scraping comic detail pages).
 * Processed by the queue processor (scrape chapter + upload to TG-S3).
 */
export const chapterQueue = pgTable("chapter_queue", {
  chapterSlug:  text("chapter_slug").primaryKey(),
  comicSlug:    text("comic_slug").notNull(),
  title:        text("title").notNull(),
  date:         text("date").notNull(),
  ingested:     boolean("ingested").notNull().default(false),
  attempts:     integer("attempts").notNull().default(0),
  lastError:    text("last_error"),
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
  ingestedAt:   timestamp("ingested_at",   { withTimezone: true }),
  failedAt:     timestamp("failed_at",     { withTimezone: true }),
});

export type ChapterQueueRow    = InferSelectModel<typeof chapterQueue>;
export type NewChapterQueueRow = InferInsertModel<typeof chapterQueue>;
