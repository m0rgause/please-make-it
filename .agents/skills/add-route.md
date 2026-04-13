---
description: Guide for adding a new route to an existing module — schema, parser, service, controller chaining, and testing.
---

# Skill: Add a Route to an Existing Module

This skill guides you through adding a new route to an existing module's controller.

## Steps

### 1. Define the Validation Schema (model file)

In `src/modules/<module>/<module>.model.ts`, add schemas for the new route's params/query:

```typescript
export const NewRouteParamsSchema = t.Object({
  slug: t.String({ minLength: 1 }),
});

export type NewRouteParams = Static<typeof NewRouteParamsSchema>;
```

### 2. Add Parser Function (if new page type)

In `src/modules/<module>/<module>.parser.ts`, add a new parser if the route scrapes a different page:

```typescript
export function parseNewPage(html: string): NewType {
  const $ = cheerio.load(html);
  // ... extraction logic
}
```

### 3. Add Service Function

In `src/modules/<module>/<module>.service.ts`:

```typescript
export async function getNewThing(slug: string): Promise<NewType> {
  const cacheKey = `<module>:new:${slug}`;

  const cached = cache.get<NewType>(cacheKey);
  if (cached) return cached;

  const url = buildNewUrl(slug);
  const html = await fetchPage(url);
  const result = parseNewPage(html);

  cache.set(cacheKey, result, CACHE_TTL.DEFAULT);
  return result;
}
```

### 4. Add Route to Controller

In `src/modules/<module>/index.ts`, chain a new `.get()` / `.post()`:

```typescript
export const moduleInstance = new Elysia({ prefix: "/<module>" })
  // ... existing routes
  .get(
    "/new-path/:slug",
    async ({ params }) => {
      const result = await getNewThing(params.slug);
      return detail(result);
    },
    {
      params: NewRouteParamsSchema,
      detail: {
        summary: "Get new thing",
        tags: ["Module"],
      },
    }
  );
```

### 5. Test

```bash
curl http://localhost:3000/api/<module>/new-path/test-slug
```

## Rules
- Always validate input with TypeBox schemas
- Always use response helpers (`paginated`, `detail`, `ok`, `fail`)
- Use `PaginatedResponse` for list routes, `DetailResponse` for single-item routes
- Keep handler logic minimal — delegate to service
