---
description: Guide for writing Cheerio parsers — HTML inspection, selector patterns, text normalization, and common extraction recipes.
---

# Skill: Write a Cheerio Parser

This skill guides you through creating a parser that extracts structured data from an HTML page using Cheerio.

## Prerequisites
- You must first inspect the target page's HTML structure
- Use the browser or a scratch script to identify CSS selectors

## HTML Inspection Script

Run this in a scratch file to discover selectors:

```typescript
import * as cheerio from "cheerio";

const res = await fetch("TARGET_URL", {
  headers: { "User-Agent": "Mozilla/5.0 ..." },
});
const html = await res.text();
const $ = cheerio.load(html);

// Find the container element
const items = $("SELECTOR");
console.log(`Items found: ${items.length}`);

// Inspect first item's structure
if (items.length > 0) {
  console.log(items.first().html()?.substring(0, 1500));
}

// Walk up the DOM to find correct containers
const firstLink = $('a[href*="/target-path/"]').first();
let parent = firstLink.parent();
for (let i = 0; i < 5; i++) {
  console.log(`parent[${i}]: <${parent.prop("tagName")} class="${parent.attr("class") || ""}">`);
  parent = parent.parent();
}
```

## Parser Template

```typescript
/**
 * <Module> module — Cheerio parsers.
 *
 * Target: komiku.org
 *
 * Page structure (<url-path>):
 *   <document the HTML structure here>
 *   <container>
 *     ├── <child> (what it contains)
 *     └── <child> (what it contains)
 */

import * as cheerio from "cheerio";
import type { MyType } from "./<module>.model";
import { extractSlug } from "../../utils/url";
import { normalizeWhitespace } from "../../utils/html";

export function parseMyPage(html: string): MyType[] {
  const $ = cheerio.load(html);
  const items: MyType[] = [];

  $("<item-selector>").each((_, el) => {
    const item = $(el);

    // Extract text fields — always normalize
    const title = normalizeWhitespace(item.find("<title-selector>").text());

    // Extract href — always provide fallback
    const href = item.find("a").attr("href") ?? "";

    // Extract slug from href
    const slug = extractSlug(href);

    // Skip invalid items
    if (!title || !href) return;

    items.push({ title, slug, url: href });
  });

  return items;
}
```

## Rules

### DO
- Always use `cheerio.load(html)` — never parse HTML manually
- Always call `normalizeWhitespace()` on every text extraction
- Always call `extractSlug()` to convert href to slug
- Always document the HTML structure at the top of the file in a comment
- Always provide fallback values: `attr("href") ?? ""`
- Always skip items with missing required fields: `if (!title || !href) return`
- Keep parsers as pure functions: HTML string in → typed data out

### DON'T
- Never use `any` as a return type
- Never make HTTP requests inside a parser
- Never access environment variables or config
- Never catch errors silently — let them bubble to the service layer
- Never use regex to parse HTML — use Cheerio selectors

## Common Patterns

### Extracting text from nested elements
```typescript
// Good — specific selector
const title = normalizeWhitespace($('#Judul span[itemprop="name"]').text());

// Bad — too broad, may catch wrong element
const title = $('span[itemprop="name"]').text();
```

### Parsing metadata from a table
```typescript
const info: Record<string, string> = {};
$("table.inftable tr").each((_, el) => {
  const cells = $(el).find("td");
  if (cells.length >= 2) {
    const key = normalizeWhitespace(cells.first().text())
      .replace(/:$/, "")
      .toLowerCase();
    const value = normalizeWhitespace(cells.eq(1).text());
    info[key] = value;
  }
});
```

### Pagination extraction
```typescript
const container = $(".navigasi, .pagination, .pag-nav").first();
const current = parseInt(container.find(".current").text(), 10) || 1;
let totalPages = current;
container.find("a").each((_, el) => {
  const num = parseInt($(el).text().trim(), 10);
  if (!isNaN(num) && num > totalPages) totalPages = num;
});
```
