# Diary

A high-performance comic scraping API built on **Bun + ElysiaJS**, backed by **PostgreSQL**, **Redis**, and **TG-S3** (Telegram-backed S3-compatible storage).

Serves all comic data directly from the database — live scraping is fully decoupled into background workers.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Framework | [ElysiaJS](https://elysiajs.com) |
| Database | PostgreSQL + [Drizzle ORM](https://orm.drizzle.team) |
| Queue | Redis (RPUSH/BLPOP) |
| Image Storage | TG-S3 (S3-compatible, Cloudflare Workers) |
| HTML Parsing | [Cheerio](https://cheerio.js.org) |
| Source | [komiku.org](https://komiku.org) |

---

## Architecture

```
API Server (Elysia)
  └── Serves from PostgreSQL only (no live scraping in request path)

Background Workers (supervisord)
  ├── schedule          — runs every 6h, triggers sync jobs
  │     ├── ingest:pustaka   — syncs comic list from WP REST API → pustaka_items
  │     └── discover:comics  — scrapes comic pages → pushes slugs to Redis queue
  └── ingest:chapters   — BRPOP from Redis → scrape chapter → TG-S3 → PostgreSQL
```

### Data Flow

```
WP REST API (komiku.org)
  → ingest:pustaka
    → pustaka_items (PostgreSQL)
      → discover:comics
        → queue:chapters (Redis LIST)
          → ingest:chapters
            → chapter images (TG-S3)
            → chapters + chapter_images (PostgreSQL)
```

---

## Project Structure

```
src/
├── app.ts                      # App assembly (plugins + modules)
├── index.ts                    # Entry point
├── config/
│   ├── app.config.ts           # Constants (TTLs, fetcher config, etc.)
│   └── env.ts                  # Typed env vars (validated at startup)
├── core/
│   ├── cache/                  # In-memory TTL cache
│   ├── database/               # Drizzle ORM setup + schema
│   │   ├── index.ts            # DB client singleton
│   │   └── schema.ts           # Table definitions (source of truth)
│   ├── errors/                 # AppError hierarchy
│   ├── fetcher/                # HTTP fetch wrapper (retry + rate-limit detection)
│   ├── logger/                 # Pino logger
│   ├── plugins/                # Elysia plugins (helmet, cors, rate-limit, errors)
│   ├── queue/                  # Redis queue client (RPUSH/BLPOP)
│   └── response/               # Standardised API response helpers
├── modules/
│   ├── comic/                  # Live scraping (comic list + detail) — legacy
│   ├── pustaka/                # DB-backed comic list (recently updated)
│   ├── chapter/                # DB-backed chapter reader
│   └── ingestion/              # Protected ingestion endpoints + services
├── types/                      # Shared TypeScript types
└── utils/                      # Pure utilities (url, html, string)

scripts/
├── schedule.ts                 # Master scheduler (runs every 6h)
├── ingest-pustaka.ts           # One-shot: sync comic list from WP REST API
├── discover-comics.ts          # Orchestrator: scrape comics → push to Redis
└── ingest-chapters.ts          # Worker: BRPOP from Redis → scrape → S3 → DB
```

---

## Database Schema

```
pustaka_items     — comic metadata (id, slug, title, type, genres, status)
chapters          — chapter metadata (slug, title, series, images count, nav)
chapter_images    — ordered image URLs per chapter (original + TG-S3 stored)
```

### Redis Keys

```
queue:chapters          LIST   — pending chapter slugs (RPUSH in, BLPOP out)
queue:chapters:attempts HASH   — slug → attempt count (retry tracking)
queue:chapters:failed   SET    — dead-letter (dropped after MAX_TRIES)
```

---

## Setup

### Requirements

- Bun ≥ 1.x
- PostgreSQL 15+
- Redis 7+
- TG-S3 instance (or any S3-compatible storage)

### Install

```bash
bun install
```

### Environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

```env
NODE_ENV=development
PORT=3000
TARGET_URL=https://komiku.org

# PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/diary

# Redis
REDIS_URL=redis://127.0.0.1:6379

# TG-S3 / S3-compatible storage
STORAGE_ENDPOINT=https://your-storage-endpoint
STORAGE_BUCKET=your-bucket
STORAGE_ACCESS_KEY=your-access-key
STORAGE_SECRET_KEY=your-secret-key
STORAGE_PUBLIC_URL=https://your-public-url

# Protect /api/ingest/* endpoints
INGEST_API_KEY=your-secret-key
```

### Database

```bash
# Push schema to database
bun run db:push

# Open Drizzle Studio (visual DB browser)
bun run db:studio
```

---

## Development

```bash
bun run dev
```

API available at `http://localhost:3000`. Swagger UI at `http://localhost:3000/swagger`.

---

## API Routes

### Public

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/pustaka` | Paginated recently-updated comic list (from DB) |
| `GET` | `/api/pustaka/:slug` | Comic detail page (from DB) |
| `GET` | `/api/chapter/:slug` | Chapter reader with image URLs (from DB) |

### Ingestion (protected by `X-Ingest-Key`)

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/ingest/pustaka` | Ingest one page from WP REST API |
| `POST` | `/api/ingest/chapter/:slug` | Ingest one chapter (scrape + TG-S3 + DB) |
| `POST` | `/api/ingest/comic/:slug/discover` | Discover chapters for one comic |
| `GET` | `/api/ingest/queue/stats` | Queue progress stats |

---

## Background Workers

### Scripts

| Command | Role | When to run |
|---|---|---|
| `bun run schedule` | Master scheduler | Continuous (supervisord) |
| `bun run ingest:pustaka` | Sync comic list from WP API | Called by scheduler |
| `bun run discover:comics` | Discover chapters → Redis queue | Called by scheduler |
| `bun run ingest:chapters` | Process chapter queue | Continuous (supervisord) |

### Supervisord

```ini
[program:schedule]
command=bun run schedule
directory=/path/to/diary
autostart=true
autorestart=true
stopwaitsecs=60
stdout_logfile=/var/log/diary/schedule.log
stderr_logfile=/var/log/diary/schedule-error.log
environment=NODE_ENV="production"

[program:ingest-chapters]
command=bun run ingest:chapters
directory=/path/to/diary
autostart=true
autorestart=true
stopwaitsecs=30
numprocs=2                   ; scale horizontally
process_name=%(program_name)s_%(process_num)02d
stdout_logfile=/var/log/diary/ingest-chapters-%(process_num)02d.log
stderr_logfile=/var/log/diary/ingest-chapters-%(process_num)02d-error.log
environment=NODE_ENV="production"
```

### Retry Behaviour

Mirrors Laravel's `$tries` / `$backoff` pattern:

| Attempt | Wait before retry |
|---|---|
| 1st failure | 10 seconds |
| 2nd failure | 30 seconds |
| 3rd failure | Dropped → `queue:chapters:failed` (dead-letter) |

---

## Production

```bash
# Run API server
bun run start

# Run workers (use supervisord in production)
bun run schedule
bun run ingest:chapters
```

---

## License

Private.
