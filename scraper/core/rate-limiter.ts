export interface RateLimiterOptions {
  minDelayMs?: number; // default 3000ms
  maxDelayMs?: number; // default 7000ms
}

export class DomainRateLimiter {
  private lastRequestTimePerDomain: Map<string, number> = new Map();
  private minDelayMs: number;
  private maxDelayMs: number;

  constructor(options: RateLimiterOptions = {}) {
    this.minDelayMs = options.minDelayMs ?? 3000;
    this.maxDelayMs = options.maxDelayMs ?? 7000;
  }

  /**
   * Calculates random jitter between minDelayMs and maxDelayMs
   */
  private getJitterDelay(): number {
    return Math.floor(
      this.minDelayMs + Math.random() * (this.maxDelayMs - this.minDelayMs)
    );
  }

  /**
   * Enforces domain rate limit with randomized jitter
   */
  public async throttle(domain: string, explicitCrawlDelaySec?: number): Promise<number> {
    const now = Date.now();
    const lastTime = this.lastRequestTimePerDomain.get(domain) || 0;
    const elapsed = now - lastTime;

    // Use crawl-delay from robots.txt if provided and larger than minDelay
    const targetDelay = explicitCrawlDelaySec
      ? Math.max(explicitCrawlDelaySec * 1000, this.getJitterDelay())
      : this.getJitterDelay();

    if (elapsed < targetDelay) {
      const waitTime = targetDelay - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.lastRequestTimePerDomain.set(domain, Date.now());
      return waitTime;
    }

    this.lastRequestTimePerDomain.set(domain, Date.now());
    return 0;
  }

  /**
   * Reset tracking timestamp for a domain
   */
  public reset(domain?: string) {
    if (domain) {
      this.lastRequestTimePerDomain.delete(domain);
    } else {
      this.lastRequestTimePerDomain.clear();
    }
  }
}
