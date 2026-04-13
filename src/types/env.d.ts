// Type declarations for environment variables
// This file augments Bun's global env type

declare module "bun" {
  interface Env {
    NODE_ENV: "development" | "production" | "test";
    PORT: string;
    BASE_URL: string;
    TARGET_URL: string;
    LOG_LEVEL: string;
    CORS_ORIGINS: string;
    RATE_LIMIT_MAX: string;
    RATE_LIMIT_WINDOW: string;
  }
}
