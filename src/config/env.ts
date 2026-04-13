/**
 * Typed environment configuration.
 *
 * Validates and parses all environment variables at startup.
 * Fails fast with a descriptive error if any required variable is missing.
 */

function requireEnv(key: string): string {
  const value = Bun.env[key];
  if (value === undefined || value === "") {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  const value = Bun.env[key];
  return value !== undefined && value !== "" ? value : fallback;
}

function parseIntEnv(key: string, fallback: number): number {
  const raw = Bun.env[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`[env] Invalid integer for ${key}: "${raw}"`);
  }
  return parsed;
}

export const env = {
  /** Application environment */
  NODE_ENV: optionalEnv("NODE_ENV", "development") as
    | "development"
    | "production"
    | "test",

  /** Server port */
  PORT: parseIntEnv("PORT", 3000),

  /** Public-facing base URL */
  BASE_URL: optionalEnv("BASE_URL", "http://localhost:3000"),

  /** Target comic site to scrape */
  TARGET_URL: requireEnv("TARGET_URL"),

  /** Pino log level */
  LOG_LEVEL: optionalEnv("LOG_LEVEL", "debug"),

  /** Allowed CORS origins (comma-separated) */
  CORS_ORIGINS: optionalEnv("CORS_ORIGINS", "*")
    .split(",")
    .map((s) => s.trim()),

  /** Rate limit: max requests per window per IP */
  RATE_LIMIT_MAX: parseIntEnv("RATE_LIMIT_MAX", 100),

  /** Rate limit: window duration in milliseconds */
  RATE_LIMIT_WINDOW: parseIntEnv("RATE_LIMIT_WINDOW", 60000),

  /** Helper flags */
  get isDev() {
    return this.NODE_ENV === "development";
  },
  get isProd() {
    return this.NODE_ENV === "production";
  },
} as const;
