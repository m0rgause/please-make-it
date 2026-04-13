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
export function buildComicListUrl(page: number = 1): string {
  const base = `${env.TARGET_URL}/daftar-komik/`;
  return page > 1 ? `${base}?halaman=${page}` : base;
}

/**
 * Build the target site URL for a comic detail page.
 */
export function buildComicDetailUrl(slug: string): string {
  return `${env.TARGET_URL}/manga/${slug}/`;
}
