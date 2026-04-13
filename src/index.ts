/**
 * Application entry point.
 *
 * Bootstraps the Elysia app and starts listening.
 */

import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT);

console.log(
  `🔖 Diary is running at ${app.server?.hostname}:${app.server?.port}`
);
console.log(`   Environment: ${env.NODE_ENV}`);
console.log(`   Target:      ${env.TARGET_URL}`);
