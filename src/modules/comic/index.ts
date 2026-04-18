/**
 * Comic module — Elysia controller (routes).
 *
 * Each Elysia instance acts as a controller.
 * Routes validate input via TypeBox schemas,
 * then delegate to the service layer.
 */

import { Elysia } from "elysia";
import {
  ComicListQuerySchema,
  ComicDetailParamsSchema,
} from "./comic.model";
import { getComicList, getComicDetail } from "./comic.service";
import { paginated, detail } from "../../core/response";

export const comicModule = new Elysia({ prefix: "/comic" })

  /**
   * GET /api/comic
   * List all comics with pagination.
   */
  .get(
    "/",
    async ({ query }) => {
      const page = query.page ?? 1;
      const tipe = query.tipe ?? "";
      const result = await getComicList(page, tipe);
      return paginated(result.comics, result.currentPage, result.totalPages);
    },
    {
      query: ComicListQuerySchema,
      detail: {
        summary: "List comics",
        description: "Get paginated list of all comics from the catalog",
        tags: ["Comic"],
      },
    }
  )

  /**
   * GET /api/comic/:slug
   * Get comic detail with chapter list.
   */
  .get(
    "/:slug",
    async ({ params }) => {
      const result = await getComicDetail(params.slug);
      return detail(result);
    },
    {
      params: ComicDetailParamsSchema,
      detail: {
        summary: "Comic detail",
        description:
          "Get full comic detail including synopsis, metadata, and chapter list",
        tags: ["Comic"],
      },
    }
  );
