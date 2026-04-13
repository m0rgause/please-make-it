---
description: Full request lifecycle — from HTTP request through cache, fetch, parse, to JSON response. Covers cache-aside pattern, error flow, and retry strategy.
---

# Workflow: Scrape Flow

The complete request lifecycle from HTTP request to JSON response.

## Flow Diagram

```
Client Request
  → Elysia Router (controller/index.ts)
    → Input Validation (TypeBox model)
      → Service Layer
        → Check Cache (core/cache)
          → HIT: return cached data
          → MISS:
            → Fetcher (core/fetcher) → HTTP GET to komiku.org
              → On failure: retry with exponential backoff
              → After max retries: throw ScrapingError (502)
            → Parser (module parser) → Cheerio HTML → typed data
              → If no data found: throw NotFoundError (404)
            → Store in cache with TTL
        → Return data to controller
      → Response Helper (paginated/detail/ok)
    → JSON Response to Client
```

## Cache Behavior

### Cache Keys
- Comic list: `comic:list:{page}` (TTL: 5 min)
- Comic detail: `comic:detail:{slug}` (TTL: 10 min)
- Pattern: `{module}:{operation}:{identifier}`

### Cache-Aside Pattern
```
1. Service receives request
2. Build cache key from params
3. cache.get<Type>(key)
4. If hit → return immediately (fast path)
5. If miss → fetch HTML → parse → cache.set(key, data, ttl) → return
```

## Error Flow

| Error Type | HTTP Status | When |
|---|---|---|
| `VALIDATION` | 422 | TypeBox schema validation fails |
| `BadRequestError` | 400 | Custom input validation fails |
| `NotFoundError` | 404 | Parser returns empty / no match |
| `ScrapingError` | 502 | Fetch to komiku.org fails after retries |
| Unexpected | 500 | Anything else (masked in production) |

## Retry Strategy

```
Attempt 1: immediate
Attempt 2: wait 500ms
Attempt 3: wait 1000ms
→ Give up → throw ScrapingError
```
