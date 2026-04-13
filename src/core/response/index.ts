/**
 * Standardized API response builder functions.
 *
 * Every endpoint should return one of these shapes
 * to ensure consistent response structure.
 */

import type {
  PaginatedResponse,
  DetailResponse,
  ErrorResponse,
  ResponseMeta,
} from "../../types/api";

/** Generate base metadata with current timestamp */
function baseMeta(): ResponseMeta {
  return { timestamp: new Date().toISOString() };
}

/**
 * Success response for paginated list endpoints.
 */
export function paginated<T>(
  data: T[],
  page: number,
  totalPages: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: {
      ...baseMeta(),
      page,
      totalPages,
    },
  };
}

/**
 * Success response for single-item detail endpoints.
 */
export function detail<T>(data: T): DetailResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: baseMeta(),
  };
}

/**
 * Generic success response (alias for detail).
 */
export function ok<T>(data: T): DetailResponse<T> {
  return detail(data);
}

/**
 * Error response.
 */
export function fail(error: string): ErrorResponse {
  return {
    success: false,
    data: null,
    error,
    meta: baseMeta(),
  };
}
