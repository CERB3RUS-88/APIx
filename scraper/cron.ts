import { ScraperRunner } from './runner';

/**
 * Autonomous Cron Worker for APIx
 * Default: Executes daily at 06:00 IST (00:30 UTC)
 */
async function scheduleDailyRun() {
  console.log(`[APIx Cron Worker] Started. Active schedule: Daily at 06:00 IST (00:30 UTC)`);
  console.log(`[APIx Cron Worker] Press Ctrl+C to terminate background worker.\n`);

  const runner = new ScraperRunner();

  // Helper to calculate milliseconds until next 06:00 IST
  function getMsUntilNext6AM_IST(): number {
    const now = new Date();
    // Convert current time to IST offset (UTC+5:30)
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istTime = new Date(utcTime + 5.5 * 3600000);

    const next6AM = new Date(istTime);
    next6AM.setHours(6, 0, 0, 0);

    if (istTime.getTime() >= next6AM.getTime()) {
      next6AM.setDate(next6AM.getDate() + 1);
    }

    const diffMs = next6AM.getTime() - istTime.getTime();
    return diffMs;
  }

  async function executeDailyBatch() {
    console.log(`\n[APIx Cron Worker] Triggering scheduled daily scrape batch at ${new Date().toISOString()}...`);
    try {
      await runner.runBatch({
        headless: true,
      });
      console.log(`[APIx Cron Worker] Daily batch completed successfully.`);
    } catch (err) {
      console.error(`[APIx Cron Worker] Error in scheduled run: ${(err as Error).message}`);
    }

    // Schedule next run
    const nextWaitMs = getMsUntilNext6AM_IST();
    const hours = (nextWaitMs / 3600000).toFixed(2);
    console.log(`[APIx Cron Worker] Next batch scheduled in ${hours} hours (at 06:00 IST).`);
    setTimeout(executeDailyBatch, nextWaitMs);
  }

  // Initial immediate run or countdown
  console.log(`[APIx Cron Worker] Running initial baseline batch on startup...`);
  await executeDailyBatch();
}

scheduleDailyRun();
