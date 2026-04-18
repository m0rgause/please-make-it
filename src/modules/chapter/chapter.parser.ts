/**
 * Chapter module — Cheerio parsers.
 *
 * Pure functions that receive raw HTML and return typed data.
 * No side effects, no HTTP calls. Only selector logic lives here.
 *
 * Target: komiku.org
 *
 * Chapter reader page structure (/{chapter-slug}/):
 *   <head>
 *     <script>
 *       var chapterData = {
 *         id, idseries, series, chapter, jumlahgambar,
 *         link, link_series, thumbnail, hasNext
 *       };
 *     </script>
 *   </head>
 *   <body class="chapter">
 *     <h1>One Piece Chapter 1179</h1>
 *     div#Baca_Komik
 *       ├── h2.judulbaca (heading "Baca Online")
 *       └── img.klazy.ww[src, alt, id] (chapter pages — sequential ids 1..N)
 *     div.toolbar
 *       ├── a[aria-label="List"][href]  → back to comic detail
 *       ├── a[aria-label="Prev"][href, title] → previous chapter (optional)
 *       └── a[aria-label="Next"][href, title] → next chapter (optional)
 */

import * as cheerio from "cheerio";
import type { ChapterDetail, ChapterNav } from "./chapter.model";
import { extractSlug } from "../../utils/url";
import { normalizeWhitespace } from "../../utils/html";

/**
 * Parse a chapter reader page (/{chapter-slug}/).
 *
 * @param html - Raw HTML string of the chapter page
 * @param slug - The chapter slug (used as fallback)
 */
export function parseChapterDetail(html: string, slug: string): ChapterDetail {
  const $ = cheerio.load(html);

  // ── Title ──────────────────────────────────────────────────
  const title = normalizeWhitespace($("h1").first().text());

  // ── chapterData JS variable ────────────────────────────────
  // Extracted from inline <script>: var chapterData={...};
  let series = "";
  let chapter = "";
  let comicUrl = "";

  const chapterDataMatch = html.match(/var\s+chapterData\s*=\s*(\{.*?\});/);

  if (chapterDataMatch && chapterDataMatch[1]) {
    try {
      // The object in the script is not strictly valid JSON (keys unquoted),
      // we can extract using regex
      const str = chapterDataMatch[1];
      const seriesMatch = str.match(/series\s*:\s*"([^"]+)"/);
      const chapterMatch = str.match(/chapter\s*:\s*"([^"]+)"/);
      const linkSeriesMatch = str.match(/link_series\s*:\s*"([^"]+)"/);

      series = seriesMatch ? seriesMatch[1] : "";
      chapter = chapterMatch ? chapterMatch[1] : "";
      comicUrl = linkSeriesMatch
        ? linkSeriesMatch[1].replace(/\\\//g, "/")
        : "";
    } catch (e) {
      // Ignore
    }
  }

  // ── Comic slug ─────────────────────────────────────────────
  const comicSlug = comicUrl ? extractSlug(comicUrl) : "";

  // ── Images ─────────────────────────────────────────────────
  // Images are inside #Baca_Komik, using class="klazy ww" with src attribute
  const images: string[] = [];
  $("#Baca_Komik img").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    if (src) images.push(src);
  });

  // ── Navigation ─────────────────────────────────────────────
  let prevChapter: ChapterNav | null = null;
  let nextChapter: ChapterNav | null = null;

  const prevAnchor = $('a[aria-label="Prev"]').first();
  if (prevAnchor.length) {
    const href = prevAnchor.attr("href") ?? "";
    prevChapter = {
      title: normalizeWhitespace(prevAnchor.attr("title") ?? ""),
      slug: extractSlug(href),
      url: href,
    };
  }

  const nextAnchor = $('a[aria-label="Next"]').first();
  if (nextAnchor.length) {
    const href = nextAnchor.attr("href") ?? "";
    nextChapter = {
      title: normalizeWhitespace(nextAnchor.attr("title") ?? ""),
      slug: extractSlug(href),
      url: href,
    };
  }

  return {
    title,
    series,
    chapter,
    slug,
    comicUrl,
    comicSlug,
    images,
    totalImages: images.length,
    prevChapter,
    nextChapter,
  };
}
