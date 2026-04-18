/**
 * Pustaka module — TypeBox schemas and inferred TypeScript types.
 *
 * "Pustaka" is the recently-updated comic list sourced from the
 * Komiku WordPress REST API (api.komiku.org/wp-json/wp/v2/manga).
 *
 * Single source of truth: define the schema once,
 * infer the type with Static<typeof schema>.
 */

import { t, type Static } from "elysia";

// ─── List Item ────────────────────────────────────────────────

/** Schema for a single comic in the recently-updated list */
export const PustakaItemSchema = t.Object({
  id: t.Number(),
  title: t.String(),
  slug: t.String(),
  url: t.String(),
  type: t.String(),
  genres: t.Array(t.String()),
  status: t.String(),
  updatedAt: t.String(),
});

export type PustakaItem = Static<typeof PustakaItemSchema>;

// ─── Route Query ─────────────────────────────────────────────

/**
 * Allowed `orderby` values for the WP REST API.
 *   - date     → sorted by publication date (default)
 *   - modified → sorted by last-modified date
 */
export const PustakaOrderBySchema = t.Union([
  t.Literal("date"),
  t.Literal("modified"),
]);

export type PustakaOrderBy = Static<typeof PustakaOrderBySchema>;

/** Query params for the pustaka list endpoint */
export const PustakaQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  /** Filter by comic type: manga | manhwa | manhua */
  tipe: t.Optional(
    t.Union([
      t.Literal("manga"),
      t.Literal("manhwa"),
      t.Literal("manhua"),
      t.Literal(""),
    ])
  ),
  /** Sort order */
  orderby: t.Optional(PustakaOrderBySchema),
});

export type PustakaQuery = Static<typeof PustakaQuerySchema>;
