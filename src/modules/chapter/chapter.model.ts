/**
 * Chapter module — TypeBox schemas and inferred TypeScript types.
 *
 * Single source of truth: define the schema once,
 * infer the type with Static<typeof schema>.
 */

import { t, type Static } from "elysia";

// ─── Navigation Entry ─────────────────────────────────────────

/** Schema for a previous/next chapter navigation link */
export const ChapterNavSchema = t.Object({
  title: t.String(),
  slug: t.String(),
  url: t.String(),
});

export type ChapterNav = Static<typeof ChapterNavSchema>;

// ─── Detail ──────────────────────────────────────────────────

/** Schema for the full chapter reader detail */
export const ChapterDetailSchema = t.Object({
  /** Chapter page title, e.g. "One Piece Chapter 1179" */
  title: t.String(),

  /** Comic series name, e.g. "One Piece" */
  series: t.String(),

  /** Chapter identifier, e.g. "1179" */
  chapter: t.String(),

  /** Slug of this chapter page, e.g. "one-piece-chapter-1179" */
  slug: t.String(),

  /** URL back to the parent comic detail page */
  comicUrl: t.String(),

  /** Slug of the parent comic, e.g. "komik-one-piece-indo" */
  comicSlug: t.String(),

  /** Ordered list of image URLs for the chapter pages */
  images: t.Array(t.String()),

  /** Total number of images */
  totalImages: t.Number(),

  /** Previous chapter navigation (null if first chapter) */
  prevChapter: t.Union([ChapterNavSchema, t.Null()]),

  /** Next chapter navigation (null if latest chapter) */
  nextChapter: t.Union([ChapterNavSchema, t.Null()]),
});

export type ChapterDetail = Static<typeof ChapterDetailSchema>;

// ─── Route Params ────────────────────────────────────────────

/** Path params for the chapter read endpoint */
export const ChapterParamsSchema = t.Object({
  slug: t.String({ minLength: 1, pattern: "^[a-z0-9-]+$" }),
});

export type ChapterParams = Static<typeof ChapterParamsSchema>;
