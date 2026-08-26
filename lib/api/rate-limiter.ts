import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute

const ipStore = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipStore.entries()) {
      if (now > record.resetTime) {
        ipStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
}

export function checkRateLimit(request: NextRequest): {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  headers: Record<string, string>;
} {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

  const now = Date.now();
  let record = ipStore.get(ip);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
    ipStore.set(ip, record);
  } else {
    record.count++;
  }

  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count);
  const resetSeconds = Math.ceil((record.resetTime - now) / 1000);
  const allowed = record.count <= MAX_REQUESTS_PER_WINDOW;

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(resetSeconds),
    'X-RateLimit-Scope': 'per-instance',
  };

  return {
    allowed,
    limit: MAX_REQUESTS_PER_WINDOW,
    remaining,
    reset: resetSeconds,
    headers,
  };
}
