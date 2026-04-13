---
trigger: always_on
glob:
description: TypeBox usage, no-any policy, strict return types, and schema-first approach for the Diary project.
---

# Rule: Type Safety

## Core Principles

1. **No `any` — ever.** Use `unknown` if the type is truly unknown, then narrow.
2. **Schema-first.** Define TypeBox schemas, then infer TS types via `Static<typeof>`.
3. **Strict tsconfig.** `strict: true`, `noUncheckedIndexedAccess: true` are non-negotiable.

## TypeBox Usage

### Define schemas in model files
```typescript
import { t, type Static } from "elysia";

export const MySchema = t.Object({
  title: t.String(),
  count: t.Number(),
  tags: t.Array(t.String()),
  optional: t.Optional(t.String()),
});

// Infer the TS type from the schema — NEVER duplicate manually
export type My = Static<typeof MySchema>;
```

### Route validation
```typescript
.get("/path", handler, {
  query: MyQuerySchema,   // validates query params
  params: MyParamsSchema, // validates path params
  body: MyBodySchema,     // validates request body
})
```

### Numeric query params
Elysia query params arrive as strings. Use `t.Numeric()` for automatic string → number:
```typescript
export const PaginationQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
});
```

## Parser Return Types

Always specify return types explicitly:
```typescript
// Good
export function parseComicList(html: string): ComicListItem[] { ... }

// Bad
export function parseComicList(html: string) { ... }
```

## Nullable Fields

Use `t.Union([SomeSchema, t.Null()])` for fields that may be null:
```typescript
export const MySchema = t.Object({
  firstChapter: t.Union([ChapterEntrySchema, t.Null()]),
});
```

## Cache Type Safety

Use the generic parameter on `cache.get`:
```typescript
const data = cache.get<ComicDetail>(cacheKey);
// data is ComicDetail | null — properly typed
```

## Error Types

Custom errors extend `AppError` with proper `statusCode` and `code`:
```typescript
class ScrapingError extends AppError {
  constructor(message: string) {
    super(502, message, "SCRAPING_ERROR");
  }
}
```

## Forbidden Patterns

```typescript
// ❌ Never use `any`
const data: any = parseResult;

// ❌ Never use type assertions without narrowing
const item = data as ComicListItem;

// ❌ Never ignore TypeScript errors
// @ts-ignore
someFunction();

// ❌ Never define types AND schemas separately
interface MyType { title: string } // Don't do this
const MySchema = t.Object({ title: t.String() }) // If you have the schema

// ✅ Instead, infer types from schemas
type MyType = Static<typeof MySchema>;
```
