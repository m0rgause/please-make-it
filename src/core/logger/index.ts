/**
 * Logger setup using @bogeychan/elysia-logger (pino-based).
 *
 * Exports:
 *  - `loggerPlugin`: Elysia plugin for automatic HTTP request logging
 *  - `log`: standalone pino logger instance for manual logging in services
 */

import { logger as elysiaLogger } from "@bogeychan/elysia-logger";
import { env } from "../../config/env";

/** Elysia plugin — auto-logs HTTP requests/responses */
export const loggerPlugin = elysiaLogger({
  level: env.LOG_LEVEL as
    | "fatal"
    | "error"
    | "warn"
    | "info"
    | "debug"
    | "trace",
  transport: env.isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      }
    : undefined,
  autoLogging: true,
});

/**
 * Standalone logger for use in services, parsers, and utilities.
 *
 * Use this when you need to log outside the Elysia request lifecycle:
 *   import { log } from "@/core/logger";
 *   log.info({ slug }, "Fetching comic detail");
 *   log.error({ err }, "Parser failed");
 */
export { loggerPlugin as log };
