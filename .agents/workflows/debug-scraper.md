---
description: Debugging workflow for when scrapers break — inspect HTML changes, update selectors, verify fixes. Use when API returns empty data or 404 for pages that should exist.
---

# Workflow: Debug Scraper

When data extraction stops working (selectors break, site changes), follow this workflow.

## Symptoms
- API returns `404 NotFoundError` for pages that should exist
- Returned data has empty fields or wrong values
- Parser returns 0 items for a list page

## Step 1: Verify the Target Page

Fetch the raw HTML to confirm the page is still accessible:

```typescript
// Scratch script: scratch/debug-page.ts
const res = await fetch("https://komiku.org/TARGET_PATH", {
  headers: { "User-Agent": "Mozilla/5.0 ..." },
});
console.log(`Status: ${res.status}`);
const html = await res.text();
console.log(`HTML length: ${html.length}`);
// Save to file for inspection
await Bun.write("scratch/debug-output.html", html);
```

If status is not 200, the issue is network-level (IP ban, site down, etc.).

## Step 2: Inspect Changed HTML Structure

Load the HTML in Cheerio and test selectors:

```typescript
import * as cheerio from "cheerio";

const html = await Bun.file("scratch/debug-output.html").text();
const $ = cheerio.load(html);

// Test the existing selector
const items = $("CURRENT_SELECTOR");
console.log(`Current selector found: ${items.length}`);

// If 0, try broader selectors to find the new structure
const links = $('a[href*="/manga/"]');
console.log(`Manga links found: ${links.length}`);

// Walk up the DOM from a known element
const first = links.first();
let parent = first.parent();
for (let i = 0; i < 6; i++) {
  console.log(`parent[${i}]: <${parent.prop("tagName")} class="${parent.attr("class") || ""}">`);
  parent = parent.parent();
}

// Print the first item's HTML
console.log(first.parent().html()?.substring(0, 1500));
```

## Step 3: Update the Parser

1. Edit `src/modules/<module>/<module>.parser.ts`
2. Update the CSS selectors to match the new HTML structure
3. Update the structure documentation comment at the top of the file
4. If field names changed, update the extraction logic

## Step 4: Clear Cache and Test

```bash
# The cache auto-evicts, but for immediate testing:
# Restart the dev server (bun run dev) to clear in-memory cache
# Then hit the endpoint
curl http://localhost:3000/api/comic?page=1
```

## Step 5: Verify All Routes

Test every route in the affected module:
```bash
curl http://localhost:3000/api/comic?page=1
curl http://localhost:3000/api/comic/komik-one-piece-indo
```

## Common Issues

### Site added Cloudflare protection
- Symptom: fetch returns 403 or HTML with "challenge" page
- Fix: May need to add cookies or switch to a headless browser

### Site changed class names
- Symptom: selector returns 0 items
- Fix: Re-inspect with the DOM walking approach, update selectors

### Site added/removed fields from the page
- Symptom: some fields are empty but others work
- Fix: Update the parser extraction logic for the changed fields

### Site changed URL structure
- Symptom: fetcher returns 404
- Fix: Update URL builders in `src/utils/url/index.ts`
