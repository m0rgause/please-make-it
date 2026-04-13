---
trigger: always_on
glob:
description: Naming conventions, folder structure, import ordering, and file patterns for the Diary project.
---

# Rule: Project Conventions

## Folder Structure

```
src/
├── app.ts              # App assembly (plugins + modules)
├── index.ts            # Entry point (bootstrap)
├── config/             # Environment & constants
├── modules/            # Feature-based modules
│   └── <name>/
│       ├── index.ts            # Controller (routes)
│       ├── <name>.service.ts   # Business logic
│       ├── <name>.model.ts     # TypeBox schemas + types
│       └── <name>.parser.ts    # Cheerio selectors
├── core/               # Shared infrastructure
│   ├── cache/          # TTL cache
│   ├── errors/         # Error hierarchy
│   ├── fetcher/        # HTTP fetch wrapper
│   ├── logger/         # Pino logger
│   ├── plugins/        # Global Elysia plugins
│   └── response/       # Response helpers
├── types/              # Shared TS types
└── utils/              # Pure utility functions
    ├── html/
    ├── url/
    └── string/
```

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Module folder | lowercase, singular | `comic/`, `chapter/`, `genre/` |
| Controller file | `index.ts` | `modules/comic/index.ts` |
| Service file | `<module>.service.ts` | `comic.service.ts` |
| Model file | `<module>.model.ts` | `comic.model.ts` |
| Parser file | `<module>.parser.ts` | `comic.parser.ts` |
| TypeBox schema | `PascalCase` + `Schema` | `ComicListItemSchema` |
| Inferred type | `PascalCase` (no suffix) | `ComicListItem` |
| Service function | `camelCase` verb | `getComicList`, `getComicDetail` |
| Parser function | `parse` + context | `parseComicList`, `parseComicDetail` |
| Elysia instance | `camelCase` + `Module` | `comicModule`, `chapterModule` |
| Cache key | `module:operation:id` | `comic:list:1`, `comic:detail:one-piece` |

## Import Ordering

```typescript
// 1. External packages
import { Elysia } from "elysia";
import * as cheerio from "cheerio";

// 2. Core infrastructure
import { cache } from "../../core/cache";
import { fetchPage } from "../../core/fetcher";
import { NotFoundError } from "../../core/errors";

// 3. Config
import { CACHE_TTL } from "../../config/app.config";
import { env } from "../../config/env";

// 4. Utils
import { extractSlug } from "../../utils/url";
import { normalizeWhitespace } from "../../utils/html";

// 5. Module-local imports
import type { ComicListItem } from "./comic.model";
import { parseComicList } from "./comic.parser";
```

## File Patterns

### Every module file MUST:
- Have a JSDoc comment block at the top explaining its purpose
- Export only what other files need (no internal helpers exported)
- Use explicit return types on exported functions

### Controllers MUST:
- Set a `prefix` on the Elysia instance
- Attach TypeBox schemas to every route via `query`, `params`, `body`
- Use response helpers for ALL responses
- Include `detail` metadata with `summary` and `tags`

### Services MUST:
- Follow cache-aside pattern
- Never touch Elysia Context
- Throw domain errors (NotFoundError, ScrapingError) not generic Error

### Parsers MUST:
- Be pure functions (no side effects)
- Document the HTML structure they parse
- Use `normalizeWhitespace()` on all text extractions
