import { NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { apiSuccess, apiError } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/api/rate-limiter';
import { isValidDateFormat, isValidFrequency } from '@/lib/api/validator';
import { TIME_SERIES_365D } from '@/lib/data-provider';

function loadStoredTimeSeries(): any[] {
  try {
    const csvPath = path.join(process.cwd(), 'data', 'index', 'time_series.csv');
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.trim().split('\n').slice(1); // skip header
      const records = [];
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 7) {
          records.push({
            date: parts[0],
            apix: parseFloat(parts[2]),
            rawFare: parseFloat(parts[4]),
            delta24h: parseFloat(parts[5]),
            sampledRecords: parseInt(parts[6], 10),
          });
        }
      }
      if (records.length > 0) return records;
    }
  } catch {}
  return TIME_SERIES_365D;
}

export async function GET(request: NextRequest) {
  // 1. Rate Limit Check
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return apiError(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit of ${rateLimit.limit} requests per minute exceeded. Try again in ${rateLimit.reset} seconds.`,
      429,
      undefined,
      rateLimit.headers
    );
  }

  const { searchParams } = new URL(request.url);
  const frequency = searchParams.get('frequency') || 'daily';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 365;

  // 2. Validate Frequency
  if (!isValidFrequency(frequency)) {
    return apiError(
      'INVALID_FREQUENCY',
      `Invalid frequency parameter '${frequency}'. Allowed values: 'daily', 'weekly', 'monthly'.`,
      400,
      { allowed: ['daily', 'weekly', 'monthly'] },
      rateLimit.headers
    );
  }

  // 3. Validate Date Range
  if (from && !isValidDateFormat(from)) {
    return apiError(
      'INVALID_DATE_FORMAT',
      `Invalid 'from' date format '${from}'. Expected format: YYYY-MM-DD.`,
      400,
      undefined,
      rateLimit.headers
    );
  }

  if (to && !isValidDateFormat(to)) {
    return apiError(
      'INVALID_DATE_FORMAT',
      `Invalid 'to' date format '${to}'. Expected format: YYYY-MM-DD.`,
      400,
      undefined,
      rateLimit.headers
    );
  }

  if (from && to && from > to) {
    return apiError(
      'INVALID_DATE_RANGE',
      `'from' date (${from}) cannot be after 'to' date (${to}).`,
      400,
      undefined,
      rateLimit.headers
    );
  }

  // 4. Load real/stored time-series data
  let results = loadStoredTimeSeries();

  if (from) {
    results = results.filter((p) => p.date >= from);
  }
  if (to) {
    results = results.filter((p) => p.date <= to);
  }

  // Transform based on frequency if weekly or monthly requested
  if (frequency === 'weekly') {
    const weeklyGrouped = [];
    for (let i = 0; i < results.length; i += 7) {
      const chunk = results.slice(i, i + 7);
      const avgApix = Number((chunk.reduce((a, b) => a + b.apix, 0) / chunk.length).toFixed(2));
      const avgFare = Math.round(chunk.reduce((a, b) => a + b.rawFare, 0) / chunk.length);
      weeklyGrouped.push({
        date: chunk[chunk.length - 1].date,
        frequency: 'weekly',
        apix_value: avgApix,
        base_period_value: 100.0,
        raw_weighted_fare: avgFare,
        days_aggregated: chunk.length,
      });
    }
    return apiSuccess(weeklyGrouped.slice(-limit), weeklyGrouped.length, { frequency: 'weekly' }, rateLimit.headers);
  }

  if (frequency === 'monthly') {
    const monthsMap = new Map<string, typeof results>();
    for (const pt of results) {
      const monthKey = pt.date.slice(0, 7);
      if (!monthsMap.has(monthKey)) monthsMap.set(monthKey, []);
      monthsMap.get(monthKey)!.push(pt);
    }
    const monthlyGrouped = [];
    for (const [monthKey, chunk] of monthsMap.entries()) {
      const avgApix = Number((chunk.reduce((a, b) => a + b.apix, 0) / chunk.length).toFixed(2));
      const avgFare = Math.round(chunk.reduce((a, b) => a + b.rawFare, 0) / chunk.length);
      monthlyGrouped.push({
        month: monthKey,
        frequency: 'monthly',
        apix_value: avgApix,
        base_period_value: 100.0,
        raw_weighted_fare: avgFare,
        days_aggregated: chunk.length,
      });
    }
    return apiSuccess(monthlyGrouped.slice(-limit), monthlyGrouped.length, { frequency: 'monthly' }, rateLimit.headers);
  }

  const responseData = results.slice(-limit).map((r) => ({
    index_date: r.date,
    frequency: 'daily',
    apix_value: r.apix,
    base_period_value: 100.0,
    raw_weighted_fare: r.rawFare,
    delta_24h: r.delta24h,
    records_sampled: r.sampledRecords,
  }));

  return apiSuccess(
    responseData,
    responseData.length,
    {
      frequency: 'daily',
      base_period: 'JAN 2026 = 100.00',
      base_basket_fare_inr: 5280.0,
    },
    rateLimit.headers
  );
}
