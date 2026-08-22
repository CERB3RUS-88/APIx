import { chromium, Browser, BrowserContext } from 'playwright';
import {
  BookingWindow,
  RouteTarget,
  ScrapeTask,
  ScrapeResult,
  ScraperRunOptions,
  ScrapeBatchSummary,
  IScraperSource,
} from './core/types';
import { RobotsManager } from './core/robots';
import { DomainRateLimiter } from './core/rate-limiter';
import { SnapshotStorage } from './core/storage';
import { ScraperRegistry } from './sources/registry';
import { HONEST_USER_AGENT } from './core/user-agent';

const DEFAULT_ROUTES: RouteTarget[] = [
  { id: 'DEL-BOM', origin_code: 'DEL', destination_code: 'BOM', dgca_traffic_weight: 0.185, active: true },
  { id: 'BOM-DEL', origin_code: 'BOM', destination_code: 'DEL', dgca_traffic_weight: 0.178, active: true },
  { id: 'DEL-BLR', origin_code: 'DEL', destination_code: 'BLR', dgca_traffic_weight: 0.112, active: true },
  { id: 'BLR-DEL', origin_code: 'BLR', destination_code: 'DEL', dgca_traffic_weight: 0.109, active: true },
  { id: 'BOM-BLR', origin_code: 'BOM', destination_code: 'BLR', dgca_traffic_weight: 0.094, active: true },
  { id: 'BLR-BOM', origin_code: 'BLR', destination_code: 'BOM', dgca_traffic_weight: 0.091, active: true },
  { id: 'DEL-CCU', origin_code: 'DEL', destination_code: 'CCU', dgca_traffic_weight: 0.068, active: true },
  { id: 'CCU-DEL', origin_code: 'CCU', destination_code: 'DEL', dgca_traffic_weight: 0.065, active: true },
  { id: 'BLR-HYD', origin_code: 'BLR', destination_code: 'HYD', dgca_traffic_weight: 0.052, active: true },
  { id: 'MAA-DEL', origin_code: 'MAA', destination_code: 'DEL', dgca_traffic_weight: 0.046, active: true },
];

const WINDOW_DAYS: Record<BookingWindow, number> = {
  'T+1': 1,
  'T+7': 7,
  'T+15': 15,
  'T+30': 30,
  'T+45': 45,
};

export class ScraperRunner {
  private robots = RobotsManager.getInstance();
  private rateLimiter: DomainRateLimiter;
  private storage = new SnapshotStorage();
  private registry = ScraperRegistry.getInstance();

  constructor(options?: ScraperRunOptions) {
    this.rateLimiter = new DomainRateLimiter({
      minDelayMs: options?.minJitterMs ?? 3000,
      maxDelayMs: options?.maxJitterMs ?? 7000,
    });
  }

  /**
   * Helper to format YYYY-MM-DD for T+N days ahead from now in IST
   */
  private getTargetDate(daysAhead: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  }

  /**
   * Builds matrix of tasks (Routes x Windows)
   */
  public buildTasks(routes: RouteTarget[], windows: BookingWindow[]): ScrapeTask[] {
    const tasks: ScrapeTask[] = [];
    for (const route of routes) {
      if (!route.active) continue;
      for (const win of windows) {
        const days = WINDOW_DAYS[win] || 7;
        tasks.push({
          route,
          booking_window: win,
          days_ahead: days,
          target_date: this.getTargetDate(days),
        });
      }
    }
    return tasks;
  }

  /**
   * Execute full batch run
   */
  public async runBatch(options: ScraperRunOptions = {}): Promise<ScrapeBatchSummary> {
    const startedAt = new Date().toISOString();
    const runId = `run_${Date.now()}`;
    const headless = options.headless !== false;
    const isDryRun = options.dryRun === true;

    // 1. Select routes
    let targetRoutes = DEFAULT_ROUTES;
    if (options.routes && options.routes.length > 0 && options.routes[0] !== 'all') {
      const selected = options.routes.map((r) => r.toUpperCase());
      targetRoutes = DEFAULT_ROUTES.filter((r) => selected.includes(r.id));
      if (targetRoutes.length === 0) {
        targetRoutes = DEFAULT_ROUTES.slice(0, 2);
      }
    }

    // 2. Select booking windows
    const targetWindows: BookingWindow[] =
      options.windows && options.windows.length > 0
        ? options.windows
        : ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'];

    // 3. Select sources
    let targetSources: IScraperSource[] = [];
    if (options.sources && options.sources.length > 0) {
      targetSources = options.sources
        .map((s) => this.registry.get(s))
        .filter((s): s is IScraperSource => Boolean(s));
    }
    if (targetSources.length === 0) {
      // Default: 1 Airline (IndiGo) + 1 OTA (EaseMyTrip)
      const indigo = this.registry.get('indigo');
      const easemytrip = this.registry.get('easemytrip');
      targetSources = [indigo, easemytrip].filter((s): s is IScraperSource => Boolean(s));
    }

    const tasks = this.buildTasks(targetRoutes, targetWindows);
    const totalRuns = tasks.length * targetSources.length;

    console.log(`\n======================================================================`);
    console.log(`  APIx SCRAPING ENGINE (MoSPI SIH 2026 PS 26056)`);
    console.log(`  Run ID: ${runId}`);
    console.log(`  Routes: ${targetRoutes.map((r) => r.id).join(', ')} (${targetRoutes.length})`);
    console.log(`  Windows: ${targetWindows.join(', ')} (${targetWindows.length})`);
    console.log(`  Sources: ${targetSources.map((s) => s.name).join(', ')} (${targetSources.length})`);
    console.log(`  Total Tasks to Execute: ${totalRuns}`);
    console.log(`  Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE PLAYWRIGHT'}`);
    console.log(`======================================================================\n`);

    const results: ScrapeResult[] = [];
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    if (!isDryRun) {
      browser = await chromium.launch({
        headless: headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      });
      context = await browser.newContext({
        userAgent: HONEST_USER_AGENT,
        viewport: { width: 1366, height: 768 },
      });
    }

    let completedCount = 0;

    try {
      // Iterate tasks with domain-staggered rate-limiting
      for (const source of targetSources) {
        // Step A: Check robots.txt for domain
        const robotsCheck = await this.robots.isAllowed(source.baseUrl);
        if (!robotsCheck.allowed) {
          console.warn(
            `\n⚠️ [ROBOTS.TXT DISALLOWED] Domain ${source.domain} disallowed: ${robotsCheck.reason}. Skipping source entirely.`
          );
          for (const task of tasks) {
            results.push({
              task,
              source: source.name,
              success: false,
              quotes: [],
              raw_payload: { robots_reason: robotsCheck.reason },
              scraped_at: new Date().toISOString(),
              duration_ms: 0,
              error: {
                type: 'ROBOTS_DISALLOWED',
                message: robotsCheck.reason || 'Disallowed by robots.txt',
              },
            });
            completedCount++;
          }
          continue;
        }

        console.log(`\n[Robots.txt ✓] ${source.domain} verified compliant for User-Agent: APIx-PriceIndex-Bot`);

        for (const task of tasks) {
          completedCount++;
          const prefix = `[${completedCount}/${totalRuns}] [${source.name}] ${task.route.id} (${task.booking_window} · ${task.target_date})`;

          if (isDryRun) {
            // Simulated dry run
            console.log(`${prefix} -> DRY RUN OK (simulated 4 quotes)`);
            const mockFare = Math.round(3500 + Math.random() * 4000);
            const mockBase = Math.round(mockFare * 0.82);
            const res: ScrapeResult = {
              task,
              source: source.name,
              success: true,
              quotes: [
                {
                  source: source.name,
                  carrier: '6E',
                  flight_number: '6E-501',
                  departure_time: '07:00',
                  arrival_time: '09:15',
                  is_nonstop: true,
                  base_fare: mockBase,
                  taxes: mockFare - mockBase,
                  total_fare: mockFare,
                },
              ],
              raw_payload: { simulated: true, route: task.route.id, date: task.target_date },
              scraped_at: new Date().toISOString(),
              duration_ms: 120,
              intercepted_api: true,
            };
            results.push(res);
            await this.storage.saveSnapshot(res);
            continue;
          }

          // Step B: Domain Rate-Limiting Jitter Delay
          const waitTime = await this.rateLimiter.throttle(source.domain, robotsCheck.crawlDelay);
          if (waitTime > 0) {
            console.log(`   ⏳ Jitter delay: ${(waitTime / 1000).toFixed(2)}s for domain rate limit...`);
          }

          // Step C: Scrape attempt with isolated error handling
          try {
            console.log(`${prefix} -> scraping...`);
            const result = await source.scrape(task, context!);

            if (result.success) {
              console.log(
                `   ✓ SUCCESS: ${result.quotes.length} quotes captured in ${(result.duration_ms / 1000).toFixed(1)}s (API: ${result.intercepted_api ? 'YES' : 'DOM'})`
              );
            } else {
              console.warn(
                `   ⚠️ WARNING: Failed (${result.error?.type}): ${result.error?.message}`
              );
            }

            results.push(result);
            await this.storage.saveSnapshot(result);
          } catch (taskErr) {
            const err = taskErr as Error;
            console.error(`   ✗ ERROR on task: ${err.message}`);
            const failedResult: ScrapeResult = {
              task,
              source: source.name,
              success: false,
              quotes: [],
              raw_payload: { error: err.message },
              scraped_at: new Date().toISOString(),
              duration_ms: 0,
              error: {
                type: 'UNKNOWN',
                message: err.message,
              },
            };
            results.push(failedResult);
            await this.storage.saveSnapshot(failedResult);
          }
        }
      }
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
    }

    const finishedAt = new Date().toISOString();
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalQuotes = results.reduce((acc, r) => acc + r.quotes.length, 0);
    const durations = results.map((r) => r.duration_ms).sort((a, b) => a - b);
    const medianDuration = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;

    const summary: ScrapeBatchSummary = {
      run_id: runId,
      started_at: startedAt,
      finished_at: finishedAt,
      total_tasks: totalRuns,
      successful_scrapes: successful,
      failed_scrapes: failed,
      skipped_robots: results.filter((r) => r.error?.type === 'ROBOTS_DISALLOWED').length,
      skipped_captcha: results.filter((r) => r.error?.type === 'CAPTCHA_DETECTED').length,
      total_quotes_collected: totalQuotes,
      median_duration_ms: medianDuration,
      results,
    };

    await this.storage.saveBatchSummary(summary);

    console.log(`\n======================================================================`);
    console.log(`  SCRAPING BATCH COMPLETE`);
    console.log(`  Success: ${successful}/${totalRuns} tasks`);
    console.log(`  Quotes Ingested: ${totalQuotes} fare records`);
    console.log(`  Median Task Latency: ${(medianDuration / 1000).toFixed(2)}s`);
    console.log(`  Snapshots saved to: data/snapshots/${new Date().toISOString().split('T')[0]}/`);
    console.log(`======================================================================\n`);

    return summary;
  }
}
