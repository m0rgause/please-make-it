/**
 * HTTP fetch wrapper for scraping.
 *
 * Features:
 *  - Custom User-Agent and headers
 *  - Configurable timeout via AbortController
 *  - Retry with exponential backoff
 *  - Wraps failures into ScrapingError
 */

import { FETCHER } from "../../config/app.config";
import { ScrapingError } from "../errors";

interface FetchOptions {
  /** Override default timeout (ms) */
  timeout?: number;
  /** Override default max retries */
  maxRetries?: number;
  /** Additional headers to merge */
  headers?: Record<string, string>;
}

/**
 * Fetch a page from the target site and return the HTML string.
 *
 * @param url - Full URL to fetch
 * @param options - Override defaults for timeout, retries, headers
 * @returns Raw HTML string
 * @throws ScrapingError if all retries are exhausted
 */
export async function fetchPage(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const {
    timeout = FETCHER.TIMEOUT,
    maxRetries = FETCHER.MAX_RETRIES,
    headers = {},
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": FETCHER.USER_AGENT,
          "Accept-Language": FETCHER.ACCEPT_LANGUAGE,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          ...headers,
        },
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      clearTimeout(timer);
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort (timeout) for the last attempt
      if (attempt < maxRetries - 1) {
        const delay =
          FETCHER.RETRY_BASE_DELAY * Math.pow(2, attempt);
        await Bun.sleep(delay);
      }
    }
  }

  throw new ScrapingError(
    `Failed to fetch ${url} after ${maxRetries} attempts: ${lastError?.message ?? "Unknown error"}`
  );
}

/**
 * Fetch a JSON endpoint and return the parsed body along with response headers.
 *
 * Used for REST API endpoints (e.g. the WP REST API at api.komiku.org).
 * Applies the same retry, timeout, and User-Agent logic as fetchPage.
 *
 * @param url - Full URL to fetch
 * @param options - Override defaults for timeout, retries, headers
 * @returns Parsed JSON body and the raw response headers
 * @throws ScrapingError if all retries are exhausted or JSON is invalid
 */
export async function fetchJson<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<{ data: T; headers: Headers }> {
  const {
    timeout = FETCHER.TIMEOUT,
    maxRetries = FETCHER.MAX_RETRIES,
    headers = {},
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": FETCHER.USER_AGENT,
          "Accept-Language": FETCHER.ACCEPT_LANGUAGE,
          Accept: "application/json",
          ...headers,
        },
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as T;
      return { data, headers: response.headers };
    } catch (error) {
      clearTimeout(timer);
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = FETCHER.RETRY_BASE_DELAY * Math.pow(2, attempt);
        await Bun.sleep(delay);
      }
    }
  }

  throw new ScrapingError(
    `Failed to fetch ${url} after ${maxRetries} attempts: ${lastError?.message ?? "Unknown error"}`
  );
}
