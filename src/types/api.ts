/**
 * Standardized API response types.
 *
 * Two main shapes:
 *  - PaginatedResponse: for list endpoints with page/totalPages
 *  - DetailResponse:    for single-item endpoints without pagination
 */

/** Response metadata shared across all response types */
export interface ResponseMeta {
  timestamp: string;
}

/** Paginated metadata extends base with page info */
export interface PaginatedMeta extends ResponseMeta {
  page: number;
  totalPages: number;
}

/** Paginated response — for list endpoints (comic list, search, genre listing) */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[] | null;
  error: string | null;
  meta: PaginatedMeta;
}

/** Detail response — for single-item endpoints (comic detail, chapter reader) */
export interface DetailResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta: ResponseMeta;
}

/** Error-only response shape */
export interface ErrorResponse {
  success: false;
  data: null;
  error: string;
  meta: ResponseMeta;
}
