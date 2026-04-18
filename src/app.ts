/**
 * Elysia app assembly.
 *
 * Wires up all global plugins and feature modules.
 * Exported for use in the entry point (index.ts).
 */

import { Elysia } from "elysia";
import { plugins } from "./core/plugins";
import { comicModule } from "./modules/comic";
import { pustakaModule } from "./modules/pustaka";
import { chapterModule } from "./modules/chapter";
import { API_PREFIX } from "./config/app.config";
import { ok } from "./core/response";

export const app = new Elysia()
  /**
   * Global plugins: logger, helmet, CORS, rate-limit, error handler
   */
  .use(plugins)

  /**
   * Health check — not behind API prefix
   */
  .get("/health", () => ok({ status: "ok" }))

  /**
   * API routes — all prefixed with /api
   */
  .group(API_PREFIX, (app) =>
    app.use(comicModule).use(pustakaModule).use(chapterModule)
  );

