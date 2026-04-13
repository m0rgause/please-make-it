/**
 * Shared primitive types used across modules.
 */

/** Pagination query parameters */
export interface PaginationParams {
  page: number;
}

/** Comic type classification */
export type ComicType = "Manga" | "Manhwa" | "Manhua";

/** Comic status */
export type ComicStatus = "Ongoing" | "End" | "Completed";
