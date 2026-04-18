/**
 * Application-wide constants.
 *
 * All magic numbers and configurable values live here,
 * not scattered across service files.
 */

/** HTTP fetcher configuration */
export const FETCHER = {
  /** Default request timeout in milliseconds */
  TIMEOUT: 10_000,

  /** Maximum retry attempts on failure */
  MAX_RETRIES: 3,

  /** Base delay for exponential backoff (ms) */
  RETRY_BASE_DELAY: 500,

  /** User-Agent string sent to target site */
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",

  /** Accept-Language header */
  ACCEPT_LANGUAGE: "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
} as const;

/** Cache TTL configuration (milliseconds) */
export const CACHE_TTL = {
  /** Comic list pages (5 minutes) */
  COMIC_LIST: 5 * 60 * 1000,

  /** Comic detail page (10 minutes) */
  COMIC_DETAIL: 10 * 60 * 1000,

  /** Recently-updated (pustaka) list (3 minutes — live feed) */
  PUSTAKA_LIST: 3 * 60 * 1000,

  /** Chapter reader page (15 minutes — images don't change after upload) */
  CHAPTER_DETAIL: 15 * 60 * 1000,

  /** Default TTL when not specified (5 minutes) */
  DEFAULT: 5 * 60 * 1000,
} as const;

/** Pagination defaults */
export const PAGINATION = {
  /** Items per page on target site */
  ITEMS_PER_PAGE: 50,
} as const;

/** API path prefix */
export const API_PREFIX = "/api" as const;
