import robotsParser from 'robots-parser';
import { HONEST_USER_AGENT, APIX_BOT_IDENTITY } from './user-agent';

interface CachedRobots {
  parser: ReturnType<typeof robotsParser>;
  fetchedAt: number;
  rawText: string;
}

const ROBOTS_CACHE = new Map<string, CachedRobots>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface RobotsCheckResult {
  allowed: boolean;
  crawlDelay?: number;
  reason?: string;
  domain: string;
}

export class RobotsManager {
  private static instance: RobotsManager;

  public static getInstance(): RobotsManager {
    if (!RobotsManager.instance) {
      RobotsManager.instance = new RobotsManager();
    }
    return RobotsManager.instance;
  }

  /**
   * Evaluates robots.txt compliance for target URL
   */
  public async isAllowed(targetUrl: string, strict: boolean = true): Promise<RobotsCheckResult> {
    try {
      const parsedUrl = new URL(targetUrl);
      const domain = parsedUrl.origin;
      const robotsUrl = `${domain}/robots.txt`;

      const parser = await this.getParser(domain, robotsUrl);

      if (!parser) {
        // No robots.txt found (e.g. 404), RFC 9309 standard permits crawling
        return {
          allowed: true,
          domain,
          reason: 'No robots.txt found; crawling permitted by standard',
        };
      }

      // Check specific bot name first, then fallback to general user-agent
      const isAllowedSpecific = parser.isAllowed(targetUrl, APIX_BOT_IDENTITY.name);
      const isAllowedGeneral = parser.isAllowed(targetUrl, '*');
      const isAllowed = isAllowedSpecific !== undefined ? isAllowedSpecific : (isAllowedGeneral ?? true);

      const crawlDelay = parser.getCrawlDelay(APIX_BOT_IDENTITY.name) ?? parser.getCrawlDelay('*');

      if (!isAllowed) {
        return {
          allowed: false,
          crawlDelay,
          domain,
          reason: `Disallowed by ${robotsUrl} directive for User-Agent: ${APIX_BOT_IDENTITY.name}`,
        };
      }

      return {
        allowed: true,
        crawlDelay,
        domain,
        reason: 'Explicitly or implicitly allowed by robots.txt',
      };
    } catch (error) {
      if (strict) {
        return {
          allowed: false,
          domain: targetUrl,
          reason: `Strict robots error: ${(error as Error).message}`,
        };
      }
      return {
        allowed: true,
        domain: targetUrl,
        reason: `Robots check bypassed on non-fatal error: ${(error as Error).message}`,
      };
    }
  }

  private async getParser(domain: string, robotsUrl: string) {
    const cached = ROBOTS_CACHE.get(domain);
    const now = Date.now();

    if (cached && (now - cached.fetchedAt < CACHE_TTL_MS)) {
      return cached.parser;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(robotsUrl, {
        headers: {
          'User-Agent': HONEST_USER_AGENT,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        console.warn(`[Robots] Warning: Received HTTP ${response.status} when fetching ${robotsUrl}`);
        return null;
      }

      const rawText = await response.text();
      const parser = robotsParser(robotsUrl, rawText);

      ROBOTS_CACHE.set(domain, {
        parser,
        fetchedAt: now,
        rawText,
      });

      return parser;
    } catch (err) {
      console.warn(`[Robots] Could not fetch ${robotsUrl}: ${(err as Error).message}`);
      return null;
    }
  }
}
