---
description: End-to-end workflow for adding a new scraping module — from researching target pages, inspecting HTML, scaffolding files, to testing and documenting.
---

# Workflow: Add a New Feature (End-to-End)

Complete workflow for planning, building, and testing a new scraping feature.

## Phase 1: Research

1. **Identify target pages on komiku.org**
   - What URLs will you scrape?
   - What URL patterns are used? (e.g., `/genre/{slug}/`, `/pustaka/?orderby=...`)
   - What pagination system is used? (`?halaman=N`, `?page=N`, etc.)

2. **Inspect HTML structure**
   - Use the `add-parser` skill's inspection script
   - Document all CSS selectors for: container, items, title, links, metadata, pagination
   - Save the inspection results

3. **Define data shapes**
   - What fields will each item have?
   - Which endpoints need `PaginatedResponse` vs `DetailResponse`?
   - What query params / path params are needed?

## Phase 2: Scaffold

Follow the `add-module` skill step by step:

1. `<module>.model.ts` — TypeBox schemas + types
2. `<module>.parser.ts` — Cheerio selectors (use `add-parser` skill)
3. `<module>.service.ts` — Cache-aside business logic
4. `index.ts` — Elysia controller with routes
5. Register in `src/app.ts`
6. Add cache TTLs to `src/config/app.config.ts`
7. Add URL builders to `src/utils/url/index.ts`

## Phase 3: Test

1. **Start dev server:** `bun run dev`
2. **Test each endpoint:**
   ```bash
   # List endpoint
   curl http://localhost:3000/api/<module>?page=1
   
   # Detail endpoint (if applicable)
   curl http://localhost:3000/api/<module>/<slug>
   ```
3. **Verify response shape:**
   - `success: true`
   - `data` array/object is populated
   - `meta.page` and `meta.totalPages` (for list)
   - `meta.timestamp` is present
4. **Test cache:** Hit the same endpoint twice — second should be much faster
5. **Test error cases:**
   - Invalid slug → should return 404
   - Invalid page → should return 422 validation error

## Phase 4: Document

- Update the module's parser comment block with the final HTML structure
- Add the new routes to the README if one exists
