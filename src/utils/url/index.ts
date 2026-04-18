/**
 * URL utility functions.
 *
 * Handles building absolute URLs from relative paths,
 * extracting slugs, and normalizing paths.
 */

import { env } from "../../config/env";

/**
 * Build an absolute URL from a relative path using the target site.
 *
 * @example
 *   toAbsoluteUrl("/manga/one-piece/")
 *   // => "https://komiku.org/manga/one-piece/"
 */
export function toAbsoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const base = env.TARGET_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Extract slug from a manga URL path.
 *
 * @example
 *   extractSlug("/manga/komik-one-piece-indo/")
 *   // => "komik-one-piece-indo"
 */
export function extractSlug(path: string): string {
  const segments = path.replace(/\/+$/, "").split("/");
  return segments[segments.length - 1] ?? "";
}

/**
 * Build the target site URL for a comic list page.
 */
export function buildComicListUrl(page: number = 1, tipe: string = ""): string {
  const base = `${env.TARGET_URL}/daftar-komik/`;
  return page > 1 ? `${base}?halaman=${page}&tipe=${tipe}` : `${base}?tipe=${tipe}`;
}

/**
 * Build the target site URL for a comic detail page.
 */
export function buildComicDetailUrl(slug: string): string {
  return `${env.TARGET_URL}/manga/${slug}/`;
}

/** WP REST API base for the pustaka (recently-updated) list */
const WP_REST_MANGA_BASE = "https://api.komiku.org/wp-json/wp/v2/manga";

/** tipe taxonomy term IDs used by the WP REST API */
const TIPE_ID: Record<string, number> = {
  manga: 42,
  manhwa: 48,
  manhua: 63,
};

/**
 * Build the WP REST API URL for the recently-updated comic list.
 *
 * @param page    - Page number (1-indexed, maps to WP `page` param)
 * @param tipe    - Comic type filter ("manga" | "manhwa" | "manhua" | "")
 * @param orderby - Sort order ("date" | "meta_value_num")
 * @param perPage - Items per page (default 12 to match /pustaka/ display)
 */
export function buildPustakaUrl(
  page: number = 1,
  tipe: string = "",
  orderby: string = "date",
  perPage: number = 12
): string {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    orderby,
    order: "desc",
  });

  const tipeId = tipe ? TIPE_ID[tipe] : undefined;
  if (tipeId !== undefined) {
    params.set("tipe", String(tipeId));
  }

  return `${WP_REST_MANGA_BASE}?${params.toString()}`;
}

/**
 * Build the target site URL for a chapter reader page.
 *
 * Chapter pages live at the root path: komiku.org/{chapter-slug}/
 *
 * @example
 *   buildChapterUrl("one-piece-chapter-1179")
 *   // => "https://komiku.org/one-piece-chapter-1179/"
 */
export function buildChapterUrl(slug: string): string {
  return `${env.TARGET_URL}/${slug}/`;
}
