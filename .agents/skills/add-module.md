---
description: Step-by-step guide for scaffolding a new scraping module — model, parser, service, controller, registration, and testing.
---

# Skill: Add a New Module

This skill guides you through scaffolding a new feature module in the Diary project.

## Prerequisites
- Ensure the target site's HTML structure has been inspected for the new module's pages
- Identify the URL patterns on komiku.org for the new feature

## Steps

### 1. Create the Module Directory
Create `src/modules/<module-name>/` with 4 files:

```
src/modules/<module-name>/
├── index.ts              # Elysia controller (routes)
├── <module-name>.service.ts    # Business logic
├── <module-name>.model.ts      # TypeBox schemas + TS types
└── <module-name>.parser.ts     # Cheerio selectors
```

### 2. Define Models (`<module-name>.model.ts`)

```typescript
import { t, type Static } from "elysia";

// Define TypeBox schemas for:
// 1. List item shape (if applicable)
// 2. Detail shape (if applicable)
// 3. Route query/params validation

export const ExampleItemSchema = t.Object({
  title: t.String(),
  slug: t.String(),
  url: t.String(),
  // ... fields specific to this module
});

export type ExampleItem = Static<typeof ExampleItemSchema>;

// Route validation schemas
export const ExampleQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
});

export type ExampleQuery = Static<typeof ExampleQuerySchema>;

export const ExampleParamsSchema = t.Object({
  slug: t.String({ minLength: 1 }),
});

export type ExampleParams = Static<typeof ExampleParamsSchema>;
```

**Rules:**
- Always use `t.Object()` from `elysia` (TypeBox)
- Infer TS types with `Static<typeof Schema>` — never duplicate types manually
- All query params with numbers use `t.Numeric()` (handles string → number conversion)
- Optional fields use `t.Optional()`

### 3. Create Parser (`<module-name>.parser.ts`)

```typescript
import * as cheerio from "cheerio";
import type { ExampleItem } from "./<module-name>.model";
import { extractSlug } from "../../utils/url";
import { normalizeWhitespace } from "../../utils/html";

export function parseExampleList(html: string): ExampleItem[] {
  const $ = cheerio.load(html);
  const items: ExampleItem[] = [];

  $("<selector>").each((_, el) => {
    // Extract data using Cheerio selectors
    // Always use normalizeWhitespace() on text content
    // Always use extractSlug() for href → slug conversion
  });

  return items;
}
```

**Rules:**
- Pure functions only — no fetch, no side effects
- Always wrap text in `normalizeWhitespace()`
- Return typed arrays/objects, never `any`
- Document the HTML structure in a comment block at the top of the file

### 4. Create Service (`<module-name>.service.ts`)

```typescript
import { cache } from "../../core/cache";
import { fetchPage } from "../../core/fetcher";
import { NotFoundError } from "../../core/errors";
import { CACHE_TTL } from "../../config/app.config";
import { parseExampleList } from "./<module-name>.parser";

export async function getExampleList(page: number = 1) {
  const cacheKey = `<module-name>:list:${page}`;

  const cached = cache.get<ReturnType<typeof parseExampleList>>(cacheKey);
  if (cached) return cached;

  const url = buildExampleUrl(page);
  const html = await fetchPage(url);
  const result = parseExampleList(html);

  if (result.length === 0) {
    throw new NotFoundError("No items found");
  }

  cache.set(cacheKey, result, CACHE_TTL.DEFAULT);
  return result;
}
```

**Rules:**
- Follow cache-aside pattern: check cache → miss → fetch → parse → store → return
- Never access Elysia Context (no `set`, no `request`)
- Use descriptive cache keys with module prefix: `"<module-name>:list:1"`
- Throw `NotFoundError` when parser returns empty
- Throw `ScrapingError` (via fetchPage) on network failure

### 5. Create Controller (`index.ts`)

```typescript
import { Elysia } from "elysia";
import { ExampleQuerySchema, ExampleParamsSchema } from "./<module-name>.model";
import { getExampleList } from "./<module-name>.service";
import { paginated, detail } from "../../core/response";

export const exampleModule = new Elysia({ prefix: "/<module-name>" })
  .get(
    "/",
    async ({ query }) => {
      const result = await getExampleList(query.page ?? 1);
      return paginated(result.items, result.currentPage, result.totalPages);
    },
    {
      query: ExampleQuerySchema,
      detail: {
        summary: "List examples",
        tags: ["Example"],
      },
    }
  );
```

**Rules:**
- The Elysia instance IS the controller — one instance per module
- Always set a `prefix` matching the module name
- Always attach TypeBox schemas via `query`, `params`, or `body`
- Always use response helpers: `paginated()`, `detail()`, `ok()`, `fail()`
- Keep the handler thin — delegate to service immediately

### 6. Register Module in `app.ts`

```typescript
import { exampleModule } from "./modules/example";

// Inside the .group(API_PREFIX, ...) call:
.group(API_PREFIX, (app) =>
  app
    .use(comicModule)
    .use(exampleModule)  // Add new module here
);
```

### 7. Add Cache TTL (if needed)

In `src/config/app.config.ts`, add module-specific TTL:

```typescript
export const CACHE_TTL = {
  // ...existing
  EXAMPLE_LIST: 5 * 60 * 1000,
  EXAMPLE_DETAIL: 10 * 60 * 1000,
} as const;
```

### 8. Add URL Builder (if needed)

In `src/utils/url/index.ts`, add module-specific URL builder:

```typescript
export function buildExampleUrl(page: number = 1): string {
  const base = `${env.TARGET_URL}/example-path/`;
  return page > 1 ? `${base}?halaman=${page}` : base;
}
```

### 9. Test
- Run `bun run dev`
- Hit the new endpoints via browser or curl
- Verify JSON response shape matches `PaginatedResponse` or `DetailResponse`
