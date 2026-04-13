---
trigger: always_on
---

# Rule: Error Handling

## Error Hierarchy

```
Error (built-in)
└── AppError (base — src/core/errors)
    ├── ScrapingError   → 502 Bad Gateway
    ├── NotFoundError   → 404 Not Found
    └── BadRequestError → 400 Bad Request
```

## When to Throw Each Error

| Error | Layer | When |
|---|---|---|
| `ScrapingError` | Fetcher | HTTP fetch to komiku.org fails after retries |
| `NotFoundError` | Service | Parser returns empty data / no matching content |
| `BadRequestError` | Service | Custom validation beyond TypeBox (rare) |
| Elysia `VALIDATION` | Controller | TypeBox schema validation fails (auto) |

## Rules

### In Controllers
- **Never throw errors manually.** Let the service throw, and the global `onError` handler catches.
- **Never try/catch** — errors propagate to the global handler.
- **Never return error responses manually** — use throw + global handler.

```typescript
// ✅ Good — let service throw
.get("/:slug", async ({ params }) => {
  const result = await getComicDetail(params.slug);
  return detail(result);
})

// ❌ Bad — manual error handling in controller
.get("/:slug", async ({ params, set }) => {
  try {
    const result = await getComicDetail(params.slug);
    return detail(result);
  } catch (e) {
    set.status = 500;
    return { error: e.message };
  }
})
```

### In Services
- **Throw domain errors** when business logic fails.
- **Let fetcher errors bubble** — `fetchPage()` already throws `ScrapingError`.

```typescript
// ✅ Good
export async function getComicDetail(slug: string): Promise<ComicDetail> {
  const html = await fetchPage(url); // throws ScrapingError on failure
  const result = parseComicDetail(html, slug);

  if (!result.title) {
    throw new NotFoundError(`Comic not found: ${slug}`);
  }

  return result;
}
```

### In Parsers
- **Never catch errors.** If a selector fails, the result will be empty, and the service will throw `NotFoundError`.
- **Never throw errors.** Parse what you can, return empty for what you can't.

```typescript
// ✅ Good — parser returns empty string for missing fields
const title = $('h1').text() || "";

// ❌ Bad — parser throws
if (!$('h1').length) throw new Error("Title not found");
```

## Global Error Handler

Located in `src/core/plugins/index.ts`. Handles ALL errors:

```typescript
.onError(({ code, error, set }) => {
  if (code === "VALIDATION") → 422 + masked message in prod
  if (code === "NOT_FOUND")  → 404 + "Route not found"
  if (error instanceof AppError) → error.statusCode + error.message
  else → 500 + masked in production
})
```

## Production Safety

In production (`NODE_ENV=production`):
- Stack traces are NEVER exposed
- Validation details are NEVER exposed
- Internal error messages are replaced with generic "Internal server error"
- Only `AppError` subclasses expose their message to the client
