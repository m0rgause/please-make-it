/**
 * Comic module — TypeBox schemas and inferred TypeScript types.
 *
 * Single source of truth: define the schema once,
 * infer the type with Static<typeof schema>.
 */

import { t, type Static } from "elysia";

// ─── List Item ───────────────────────────────────────────────

/** Schema for a comic in a list view */
export const ComicListItemSchema = t.Object({
  title: t.String(),
  slug: t.String(),
  url: t.String(),
  type: t.String(),
  genre: t.String(),
  status: t.String(),
});

export type ComicListItem = Static<typeof ComicListItemSchema>;

// ─── Detail ──────────────────────────────────────────────────

/** Schema for a chapter entry in the detail view */
export const ChapterEntrySchema = t.Object({
  title: t.String(),
  slug: t.String(),
  url: t.String(),
  date: t.String(),
});

export type ChapterEntry = Static<typeof ChapterEntrySchema>;

/** Schema for full comic detail */
export const ComicDetailSchema = t.Object({
  title: t.String(),
  alternativeTitle: t.String(),
  slug: t.String(),
  type: t.String(),
  theme: t.String(),
  genres: t.Array(t.String()),
  author: t.String(),
  status: t.String(),
  rating: t.String(),
  readers: t.String(),
  readDirection: t.String(),
  thumbnail: t.String(),
  synopsis: t.String(),
  firstChapter: t.Union([ChapterEntrySchema, t.Null()]),
  latestChapter: t.Union([ChapterEntrySchema, t.Null()]),
  chapters: t.Array(ChapterEntrySchema),
});

export type ComicDetail = Static<typeof ComicDetailSchema>;

// ─── Route Params / Query ────────────────────────────────────

/** Query params for list endpoint */
export const ComicListQuerySchema = t.Object({
  page: t.Optional(
    t.Numeric({ minimum: 1, default: 1 })
  ),
});

export type ComicListQuery = Static<typeof ComicListQuerySchema>;

/** Path params for detail endpoint */
export const ComicDetailParamsSchema = t.Object({
  slug: t.String({ minLength: 1 }),
});

export type ComicDetailParams = Static<typeof ComicDetailParamsSchema>;
