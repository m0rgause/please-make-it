---
trigger: always_on
glob:
description: Input validation, error masking, header policies, and rate limit configuration for the Diary project.
---

# Rule: Security

## Mandatory Plugins

All security plugins are loaded in `src/core/plugins/index.ts` and MUST remain enabled:

### 1. Helmet (HTTP Security Headers)
- Sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
- CSP is disabled in development for easier debugging
- **Never disable helmet in production**

### 2. CORS
- Development: allows all origins (`origin: true`)
- Production: restricted to `CORS_ORIGINS` env var
- **Never use `origin: "*"` with `credentials: true` in production**

### 3. Rate Limiting
- Per-IP limiting (configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW`)
- Default: 100 requests per 60 seconds per IP
- **Always keep rate limiting enabled**

## Input Validation

### Every route MUST validate:
- **Query params** via `query: SomeSchema`
- **Path params** via `params: SomeSchema`
- **Request body** via `body: SomeSchema` (for POST/PUT)

```typescript
// ✅ Mandatory
.get("/:slug", handler, {
  params: SlugParamsSchema, // required
})

// ❌ Unacceptable — no validation
.get("/:slug", async ({ params }) => {
  const result = await getComicDetail(params.slug); // unvalidated input!
})
```

### Use TypeBox types that enforce constraints:
```typescript
t.String({ minLength: 1 })          // no empty strings
t.Numeric({ minimum: 1 })           // positive numbers only
t.String({ pattern: "^[a-z0-9-]+$" }) // slug pattern
```

## Error Masking

### In Production:
- `VALIDATION` errors return "Validation failed" (never expose schema details)
- Unexpected errors return "Internal server error" (never expose stack traces)
- Only `AppError` subclasses expose their `.message` to clients

### In Development:
- Full error messages are shown for debugging

## Fetch Security

### User-Agent
- Always send a descriptive User-Agent header (configured in `app.config.ts`)
- **Never send an empty or bot-like User-Agent**

### Timeout
- Always enforce a timeout on outgoing requests (default: 10s)
- **Never make unbounded fetch calls**

### Rate Respect
- Built-in retry with exponential backoff respects the target site
- Cache reduces request frequency to the target
- **Never bypass the cache in production to spam the target site**

## Environment Variables

### Sensitive values:
- `.env` is gitignored — **never commit it**
- `.env.example` contains only placeholder values
- Production secrets go in the deployment platform's env config

### Required validation:
- `env.ts` validates all required vars at startup via `requireEnv()`
- App fails fast with a clear error if vars are missing
