/**
 * HTML sanitization and text cleanup utilities.
 *
 * Used to clean raw text extracted from Cheerio selectors.
 */

/** Remove HTML tags from a string */
export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/** Decode common HTML entities */
export function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Collapse multiple whitespace characters into single spaces and trim */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Full cleanup pipeline: strip tags → decode entities → normalize whitespace */
export function cleanText(html: string): string {
  return normalizeWhitespace(decodeEntities(stripTags(html)));
}
