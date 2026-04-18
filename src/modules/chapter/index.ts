/**
 * Chapter module — Elysia controller (routes).
 *
 * Each Elysia instance acts as a controller.
 * Routes validate input via TypeBox schemas,
 * then delegate to the service layer.
 */

import { Elysia } from "elysia";
import { ChapterParamsSchema } from "./chapter.model";
import { getChapterDetail } from "./chapter.service";
import { detail } from "../../core/response";

export const chapterModule = new Elysia({ prefix: "/chapter" })

  /**
   * GET /api/chapter/:slug
   * Get chapter reader detail (images, prev/next navigation).
   */
  .get(
    "/:slug",
    async ({ params }) => {
      const result = await getChapterDetail(params.slug);
      return detail(result);
    },
    {
      params: ChapterParamsSchema,
      detail: {
        summary: "Chapter detail",
        description:
          "Get chapter reader detail including all page images, series info, and prev/next navigation",
        tags: ["Chapter"],
      },
    }
  );
