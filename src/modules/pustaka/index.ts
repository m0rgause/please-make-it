/**
 * Pustaka module — Elysia controller (routes).
 *
 * Exposes the recently-updated comic list sourced from the
 * Komiku WordPress REST API.
 *
 * Routes:
 *   GET /api/pustaka        — paginated list (default: sorted by date)
 */

import { Elysia } from "elysia";
import { PustakaQuerySchema } from "./pustaka.model";
import { getPustakaList } from "./pustaka.service";
import { paginated } from "../../core/response";

export const pustakaModule = new Elysia({ prefix: "/pustaka" })

  /**
   * GET /api/pustaka
   * Recently-updated comic list with optional type filter and sort order.
   */
  .get(
    "/",
    async ({ query }) => {
      const page = query.page ?? 1;
      const tipe = query.tipe ?? "";
      const orderby = query.orderby ?? "date";
      const result = await getPustakaList(page, tipe, orderby);
      return paginated(result.items, result.currentPage, result.totalPages);
    },
    {
      query: PustakaQuerySchema,
      detail: {
        summary: "Recently updated comics",
        description:
          "Get paginated list of recently updated comics. Filter by type (manga/manhwa/manhua) and sort by date or popularity.",
        tags: ["Pustaka"],
      },
    }
  );
