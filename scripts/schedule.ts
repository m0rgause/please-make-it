/**
 * Master scheduler.
 *
 * Equivalent of Laravel's `$schedule->call()->everyFiveMinutes()`.
 * Runs on a fixed interval and triggers:
 *
 *   1. ingest-pustaka  — sync comic list from WP REST API (like FetchTransactionBSD)
 *   2. discover-comics — discover chapter slugs for all comics (like UpdateTransaction)
 *
 * The chapter worker (ingest-chapters.ts) runs separately as a continuous
 * supervisord process and drains the chapter_queue filled by discover-comics.
 *
 * Cycle order:
 *   ┌─────────────────────────────────────┐
 *   │  1. Sync pustaka list (fresh comics)│
 *   │  2. Discover chapters for all comics│
 *   │  3. Sleep CYCLE_INTERVAL_MS         │
 *   │  4. Repeat                          │
 *   └─────────────────────────────────────┘
 *
 * Usage:
 *   bun run schedule
 *
 * supervisord config:
 *   [program:schedule]
 *   command=bun run schedule
 *   directory=/path/to/diary
 *   autostart=true
 *   autorestart=true
 *   stopwaitsecs=60
 *
 *   [program:ingest-chapters]
 *   command=bun run ingest:chapters
 *   ...
 */



// ─── Config ──────────────────────────────────────────────────

/** How often to run the full cycle (default: every 6 hours) */
const CYCLE_INTERVAL_MS = 6 * 60 * 60 * 1_000;

// ─── State ───────────────────────────────────────────────────

let running = true;
let cycle = 0;

// ─── Graceful shutdown ───────────────────────────────────────

process.on("SIGTERM", () => {
  console.log("[schedule] SIGTERM — will stop after current cycle completes...");
  running = false;
});

process.on("SIGINT", () => {
  running = false;
});

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Run a script as a child process and wait for it to complete.
 * Streams its stdout/stderr to our own output (like piped supervisord logs).
 */
async function runScript(script: string): Promise<{ exitCode: number }> {
  console.log(`[schedule] ▶ Running: bun run ${script}`);

  const proc = Bun.spawn(["bun", "run", script], {
    cwd: import.meta.dir + "/..",
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env },
  });

  const exitCode = await proc.exited;
  return { exitCode };
}

// ─── Main loop ───────────────────────────────────────────────

console.log(`[schedule] Master scheduler started`);
console.log(`  Cycle interval : every ${CYCLE_INTERVAL_MS / 3_600_000}h`);
console.log(`  Jobs per cycle : ingest:pustaka → discover:comics\n`);

while (running) {
  cycle++;
  const started = Date.now();
  console.log(`\n[schedule] ══ Cycle ${cycle} started at ${new Date().toISOString()} ══`);

  // ── Step 1: Sync pustaka list from WP REST API ───────────────
  // Equivalent: FetchTransactionBSD / FetchTransaction
  console.log(`\n[schedule] Step 1/2 — Syncing pustaka list`);
  const pustakaResult = await runScript("ingest:pustaka");

  if (pustakaResult.exitCode !== 0) {
    console.warn(`[schedule] ⚠ ingest:pustaka exited with code ${pustakaResult.exitCode}`);
  }

  if (!running) break;

  // ── Step 2: Discover chapters for all comics ─────────────────
  // Equivalent: UpdateTransaction (orchestrator that fills the queue)
  console.log(`\n[schedule] Step 2/2 — Discovering chapters for all comics`);
  const discoverResult = await runScript("discover:comics");

  if (discoverResult.exitCode !== 0) {
    console.warn(`[schedule] ⚠ discover:comics exited with code ${discoverResult.exitCode}`);
  }

  const elapsed = Math.round((Date.now() - started) / 1000);
  console.log(`\n[schedule] ══ Cycle ${cycle} complete in ${elapsed}s ══`);

  if (!running) break;

  // ── Sleep until next cycle ───────────────────────────────────
  const nextRun = new Date(Date.now() + CYCLE_INTERVAL_MS).toLocaleTimeString("id-ID");
  console.log(`[schedule] Sleeping ${CYCLE_INTERVAL_MS / 3_600_000}h — next cycle at ${nextRun}\n`);
  await Bun.sleep(CYCLE_INTERVAL_MS);
}

console.log(`[schedule] Stopped after ${cycle} cycle(s).`);
process.exit(0);
