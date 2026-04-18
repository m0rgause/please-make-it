/**
 * Pustaka module — WordPress REST API fetcher & parser.
 *
 * Pure functions that receive raw WP REST JSON and return typed data.
 * No side effects, no HTTP calls. Only data-mapping logic lives here.
 *
 * Source: https://api.komiku.org/wp-json/wp/v2/manga
 *
 * WP REST item shape (relevant fields):
 *   {
 *     id: number,
 *     slug: string,
 *     title: { rendered: string },
 *     link: string,                   // points to secure.komikid.org — rewritten to komiku.org
 *     modified: string,               // ISO 8601 (last updated timestamp)
 *     class_list: string[],           // e.g. ["tipe-manga", "genre-fantasy", "statusmanga-ongoing", ...]
 *     tipe: number[],                 // taxonomy term IDs — derived from class_list instead
 *   }
 *
 * class_list extraction strategy (avoids N+1 _embed overhead):
 *   - type   → first item matching /^tipe-/ → strip prefix → capitalize
 *   - genres → all items matching /^genre-/ → strip prefix → capitalize, replace '-' with ' '
 *   - status → first item matching /^statusmanga-/ → strip prefix → capitalize
 */

import type { PustakaItem } from "./pustaka.model";

/** Known tipe term IDs → slug mapping (used for URL building) */
export const TIPE_ID_TO_SLUG: Record<number, string> = {
  42: "manga",
  48: "manhwa",
  63: "manhua",
};

/** Tipe slug → WP taxonomy term ID mapping (used for filtering) */
export const TIPE_SLUG_TO_ID: Record<string, number> = {
  manga: 42,
  manhwa: 48,
  manhua: 63,
};

// ─── Raw WP REST type ────────────────────────────────────────

interface WpMangaItem {
  id: number;
  slug: string;
  title: { rendered: string };
  link: string;
  modified: string;
  class_list?: string[];
  tipe?: number[];
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Capitalize and humanize a CSS-class-style slug.
 *
 * @example
 *   slugToLabel("slice-of-life") // "Slice Of Life"
 *   slugToLabel("ongoing")       // "Ongoing"
 */
function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Rewrite an internal `secure.komikid.org` link to the public `komiku.org` domain.
 *
 * @example
 *   rewriteLink("https://secure.komikid.org/manga/one-piece-indo/")
 *   // "https://komiku.org/manga/one-piece-indo/"
 */
function rewriteLink(link: string): string {
  return link.replace(/^https?:\/\/secure\.komikid\.org/, "https://komiku.org");
}

// ─── Parser ──────────────────────────────────────────────────

export interface PustakaParseResult {
  items: PustakaItem[];
  currentPage: number;
  totalPages: number;
}

/**
 * Map raw WP REST API JSON array to typed PustakaItem[].
 *
 * @param raw       - Parsed JSON array from the WP REST endpoint
 * @param page      - Current page number (passed through for the result)
 * @param totalPages - Total page count from the X-WP-TotalPages response header
 */
export function parsePustakaList(
  raw: unknown,
  page: number,
  totalPages: number
): PustakaParseResult {
  const items: PustakaItem[] = [];

  if (!Array.isArray(raw)) return { items, currentPage: page, totalPages };

  for (const entry of raw) {
    const item = entry as WpMangaItem;

    const classList: string[] = item.class_list ?? [];

    // Derive type from class_list (e.g. "tipe-manga" → "Manga")
    const typeClass = classList.find((c) => c.startsWith("tipe-"));
    const type = typeClass ? slugToLabel(typeClass.replace("tipe-", "")) : "";

    // Derive genres from class_list (e.g. "genre-slice-of-life" → "Slice Of Life")
    const genres = classList
      .filter((c) => c.startsWith("genre-"))
      .map((c) => slugToLabel(c.replace("genre-", "")));

    // Derive status from class_list (e.g. "statusmanga-ongoing" → "Ongoing")
    const statusClass = classList.find((c) => c.startsWith("statusmanga-"));
    const status = statusClass
      ? slugToLabel(statusClass.replace("statusmanga-", ""))
      : "";

    const title = item.title?.rendered ?? "";
    const url = rewriteLink(item.link ?? "");
    const updatedAt = item.modified ?? "";

    if (!title || !url) continue;

    items.push({
      id: item.id,
      title,
      slug: item.slug,
      url,
      type,
      genres,
      status,
      updatedAt,
    });
  }

  return { items, currentPage: page, totalPages };
}
