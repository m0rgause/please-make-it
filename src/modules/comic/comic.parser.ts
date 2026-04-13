/**
 * Comic module — Cheerio parsers.
 *
 * Pure functions that receive raw HTML and return typed data.
 * No side effects, no HTTP calls. Only selector logic lives here.
 *
 * Target: komiku.org
 *
 * List page structure (/daftar-komik/):
 *   #manga-list > .manga-grid > article.manga-card
 *     ├── a[href*="/manga/"] (link with thumbnail)
 *     └── div
 *         ├── h4 > a (title + href)
 *         └── p.meta ("Manhwa • Drama\nStatus: Ongoing")
 *
 * Detail page structure (/manga/:slug/):
 *   #Judul
 *     ├── h1 > span > span[itemprop="name"] (title)
 *     ├── .j2 (alternative title)
 *     └── .new1 > a (first/latest chapter links)
 *   #Informasi
 *     ├── .desc (synopsis)
 *     └── table.inftable (metadata rows)
 *   table#Daftar_Chapter > tr > td.judulseries > a (chapters)
 */

import * as cheerio from "cheerio";
import type { ComicListItem, ComicDetail, ChapterEntry } from "./comic.model";
import { extractSlug } from "../../utils/url";
import { normalizeWhitespace } from "../../utils/html";

// ─── List Parser ─────────────────────────────────────────────

export interface ComicListParseResult {
  comics: ComicListItem[];
  currentPage: number;
  totalPages: number;
}

/**
 * Parse the comic list page (/daftar-komik/).
 */
export function parseComicList(html: string): ComicListParseResult {
  const $ = cheerio.load(html);
  const comics: ComicListItem[] = [];

  $("article.manga-card").each((_, el) => {
    const card = $(el);
    const anchor = card.find("h4 a").first();
    const href = anchor.attr("href") ?? "";
    const title = normalizeWhitespace(anchor.text());
    const meta = normalizeWhitespace(card.find("p.meta").text());

    if (!title || !href) return;

    // Parse meta: "Manhwa • Drama\nStatus: Ongoing"
    const [typeGenre = "", statusLine = ""] = meta.split(/Status:\s*/i);
    const parts = typeGenre.split("•").map((s) => s.trim());
    const type = parts[0] ?? "";
    const genre = parts[1] ?? "";
    const status = statusLine.trim();

    comics.push({
      title,
      slug: extractSlug(href),
      url: href,
      type,
      genre,
      status,
    });
  });

  // Parse pagination — try multiple selectors for the pagination container
  const paginationContainer = $(".navigasi, .pagination, .pag-nav, .hpage").first();
  const currentPageEl = paginationContainer.find(".current, .page-numbers.current");
  const currentPage = parseInt(currentPageEl.text(), 10) || 1;

  // Find last page number from pagination links
  let totalPages = currentPage;
  paginationContainer.find("a").each((_, el) => {
    const text = $(el).text().trim();
    // Skip "Next →" and similar non-numeric links
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > totalPages) {
      totalPages = num;
    }
  });

  return { comics, currentPage, totalPages };
}

// ─── Detail Parser ───────────────────────────────────────────

/**
 * Parse a comic detail page (/manga/:slug/).
 */
export function parseComicDetail(html: string, slug: string): ComicDetail {
  const $ = cheerio.load(html);

  // Title — scope to #Judul to avoid catching site name
  const title = normalizeWhitespace(
    $('#Judul span[itemprop="name"]').first().text() ||
    $('#Judul h1').first().text() ||
    $("h1").first().text()
  );

  // Alternative title
  const alternativeTitle = normalizeWhitespace($(".j2").first().text());

  // Info table
  const infoRows: Record<string, string> = {};
  $("table.inftable tr").each((_, el) => {
    const cells = $(el).find("td");
    if (cells.length >= 2) {
      const key = normalizeWhitespace(cells.first().text())
        .replace(/:$/, "")
        .toLowerCase();
      const value = normalizeWhitespace(cells.eq(1).text());
      infoRows[key] = value;
    }
  });

  // Genres
  const genres: string[] = [];
  $("ul.genre li.genre a span").each((_, el) => {
    const genre = $(el).text().trim();
    if (genre) genres.push(genre);
  });

  // Synopsis
  const synopsis = normalizeWhitespace(
    $("#Informasi .desc").text() || ""
  );

  // Cover thumbnail
  const thumbnail =
    $('img[src*="thumbnail.komiku.org"]').first().attr("src") ?? "";

  // First and latest chapter
  const chapterLinks = $("#Judul .new1 a");
  let firstChapter: ChapterEntry | null = null;
  let latestChapter: ChapterEntry | null = null;

  chapterLinks.each((_, el) => {
    const a = $(el);
    const href = a.attr("href") ?? "";
    const text = normalizeWhitespace(a.text());

    const entry: ChapterEntry = {
      title: text.replace(/^(Awal|Terbaru):\s*/i, ""),
      slug: extractSlug(href),
      url: href,
      date: "",
    };

    if (text.toLowerCase().startsWith("awal")) {
      firstChapter = entry;
    } else if (text.toLowerCase().startsWith("terbaru")) {
      latestChapter = entry;
    }
  });

  // Chapter list from table#Daftar_Chapter
  const chapters: ChapterEntry[] = [];
  $("#Daftar_Chapter tr").each((_, el) => {
    const row = $(el);
    const chapterAnchor = row.find("td.judulseries a").first();
    const href = chapterAnchor.attr("href");
    if (!href) return;

    const chapterTitle = normalizeWhitespace(chapterAnchor.text());
    const date = normalizeWhitespace(
      row.find("td.tanggalseries").text()
    );

    chapters.push({
      title: chapterTitle,
      slug: extractSlug(href),
      url: href,
      date,
    });
  });

  return {
    title,
    alternativeTitle,
    slug,
    type: infoRows["tipe"] ?? "",
    theme: infoRows["tema"] ?? "",
    genres,
    author: infoRows["author"] ?? "",
    status: infoRows["status"] ?? "",
    rating: infoRows["rating"] ?? "",
    readers: infoRows["pembaca"] ?? "",
    readDirection: infoRows["cara baca"] ?? "",
    thumbnail,
    synopsis,
    firstChapter,
    latestChapter,
    chapters,
  };
}
