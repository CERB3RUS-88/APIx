import { BrowserContext, Page, Response } from 'playwright';
import { IScraperSource, ScrapeTask, ScrapeResult, RawFlightQuote } from '../core/types';
import { HONEST_USER_AGENT, DEFAULT_HEADERS } from '../core/user-agent';

export abstract class BaseScraper implements IScraperSource {
  abstract readonly name: string;
  abstract readonly domain: string;
  abstract readonly baseUrl: string;

  /**
   * Main entry point for scraping a single task
   */
  public async scrape(task: ScrapeTask, browserContext: BrowserContext): Promise<ScrapeResult> {
    const startTime = Date.now();
    const scrapedAt = new Date().toISOString();
    let page: Page | null = null;

    try {
      page = await browserContext.newPage();
      await page.setExtraHTTPHeaders(DEFAULT_HEADERS);
      await page.setViewportSize({ width: 1366, height: 768 });

      // Run source-specific extraction
      const extraction = await this.executeExtraction(task, page);

      const durationMs = Date.now() - startTime;

      return {
        task,
        source: this.name,
        success: true,
        quotes: extraction.quotes,
        raw_payload: extraction.rawPayload,
        intercepted_api: extraction.interceptedApi,
        scraped_at: scrapedAt,
        duration_ms: durationMs,
        http_status: 200,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const err = error as Error;

      // Check if CAPTCHA or bot challenge occurred
      const isCaptcha = this.isCaptchaOrBlockError(err, page);

      return {
        task,
        source: this.name,
        success: false,
        quotes: [],
        raw_payload: { error: err.message, stack: err.stack },
        scraped_at: scrapedAt,
        duration_ms: durationMs,
        error: {
          type: isCaptcha ? 'CAPTCHA_DETECTED' : err.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: err.message,
          stack: err.stack,
        },
      };
    } finally {
      if (page) {
        try {
          await page.close();
        } catch {
          // Ignore page close failures
        }
      }
    }
  }

  /**
   * Source-specific implementation for fetching & parsing fares
   */
  protected abstract executeExtraction(
    task: ScrapeTask,
    page: Page
  ): Promise<{
    quotes: RawFlightQuote[];
    rawPayload: Record<string, unknown>;
    interceptedApi: boolean;
  }>;

  /**
   * Helper to identify bot challenge or CAPTCHA pages without aggressive retries
   */
  protected isCaptchaOrBlockError(err: Error, page: Page | null): boolean {
    const msg = err.message.toLowerCase();
    if (
      msg.includes('captcha') ||
      msg.includes('cloudflare') ||
      msg.includes('perimeterx') ||
      msg.includes('access denied') ||
      msg.includes('403 forbidden') ||
      msg.includes('challenge-running')
    ) {
      return true;
    }
    return false;
  }

  /**
   * Safe numeric fare parser
   */
  protected parseFareAmount(rawText: string | number | undefined | null): number {
    if (typeof rawText === 'number') return rawText;
    if (!rawText) return 0;
    const clean = String(rawText).replace(/[^0-9.]/g, '');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }
}
