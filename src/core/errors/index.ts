/**
 * Custom error hierarchy.
 *
 * All application errors extend AppError which carries:
 *  - statusCode: HTTP status to return
 *  - code: machine-readable error identifier
 *  - message: human-readable description
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, message: string, code: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Thrown when an HTTP request to the target site fails.
 * Maps to 502 Bad Gateway.
 */
export class ScrapingError extends AppError {
  constructor(message: string) {
    super(502, message, "SCRAPING_ERROR");
    this.name = "ScrapingError";
  }
}

/**
 * Thrown when the parser cannot find expected content on the page.
 * Maps to 404 Not Found.
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(404, message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when request input fails custom validation
 * (beyond Elysia's built-in TypeBox validation).
 * Maps to 400 Bad Request.
 */
export class BadRequestError extends AppError {
  constructor(message: string = "Bad request") {
    super(400, message, "BAD_REQUEST");
    this.name = "BadRequestError";
  }
}
