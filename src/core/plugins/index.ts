/**
 * Global Elysia plugins — security, CORS, rate limiting.
 *
 * All plugins are assembled here and exported as a single
 * Elysia instance to be `.use()`-d in app.ts.
 */

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { helmet } from "elysia-helmet";
import { rateLimit } from "elysia-rate-limit";
import { env } from "../../config/env";
import { loggerPlugin } from "../logger";
import { AppError } from "../errors";
import { fail } from "../response";

export const plugins = new Elysia({ name: "plugins" })
  /**
   * Logger — must be first to capture all requests.
   */
  .use(loggerPlugin)

  /**
   * Security headers via Helmet.
   */
  .use(
    helmet({
      contentSecurityPolicy: env.isProd ? undefined : false,
    })
  )

  /**
   * CORS — restrict origins in production.
   */
  .use(
    cors({
      origin: env.isProd ? env.CORS_ORIGINS : true,
      credentials: true,
    })
  )

  /**
   * Rate limiting — per IP.
   */
  .use(
    rateLimit({
      duration: env.RATE_LIMIT_WINDOW,
      max: env.RATE_LIMIT_MAX,
      scoping: "global",
    })
  )

  /**
   * Global error handler.
   *
   * Maps AppError subclasses to standardized response shapes.
   * In production, internal errors never expose stack traces.
   */
  .onError(({ code, error, set }) => {
    // Elysia built-in validation errors
    if (code === "VALIDATION") {
      set.status = 422;
      return fail(env.isProd ? "Validation failed" : error.message);
    }

    // Elysia NOT_FOUND (route doesn't exist)
    if (code === "NOT_FOUND") {
      set.status = 404;
      return fail("Route not found");
    }

    // Our custom AppError hierarchy
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return fail(error.message);
    }

    // Unexpected errors
    set.status = 500;
    return fail(
      env.isProd
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Unknown error"
    );
  });
