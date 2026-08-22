import { NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { apiSuccess, apiError } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/api/rate-limiter';
import { isValidBookingWindow, normalizeBookingWindow } from '@/lib/api/validator';
import { DGCA_ROUTE_BASKET } from '@/lib/mock-data';
import { CleanedFareRecord } from '@/pipeline/cleaner/types';

/**
 * Loads real cleaned fare records from data/cleaned/ directory
 */
function loadCleanedFareRecords(): CleanedFareRecord[] {
  const cleanedBase = path.join(process.cwd(), 'data', 'cleaned');
  if (!fs.existsSync(cleanedBase)) {
    return [];
  }

  const allRecords: CleanedFareRecord[] = [];

  try {
    const dateDirs = fs
      .readdirSync(cleanedBase)
      .filter((d) => {
        try {
          return fs.statSync(path.join(cleanedBase, d)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort()
      .reverse(); // latest first

    for (const dir of dateDirs) {
      const fullDir = path.join(cleanedBase, dir);
      const jsonFiles = fs
        .readdirSync(fullDir)
        .filter((f) => f.startsWith('cleaned_fares_') && f.endsWith('.json'))
        .sort()
        .reverse();

      for (const file of jsonFiles) {
        try {
          const content = fs.readFileSync(path.join(fullDir, file), 'utf-8');
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.records) && parsed.records.length > 0) {
            allRecords.push(...parsed.records);
          }
        } catch {
          // Ignore corrupt file
        }
      }

      if (allRecords.length > 0) break; // Use most recent batch
    }
  } catch (err) {
    console.warn(`Error reading cleaned fare records: ${(err as Error).message}`);
  }

  return allRecords;
}

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return apiError(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded. Try again in ${rateLimit.reset} seconds.`,
      429,
      undefined,
      rateLimit.headers
    );
  }

  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get('route_id')?.toUpperCase();
  const rawBookingWindow = searchParams.get('booking_window');
  const bookingWindow = rawBookingWindow ? normalizeBookingWindow(rawBookingWindow) : undefined;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(200, parseInt(limitParam, 10)) : 50;

  // Validate Route ID if provided
  if (routeId) {
    const validRoutes = DGCA_ROUTE_BASKET.map((r) => r.id);
    if (!validRoutes.includes(routeId)) {
      return apiError(
        'INVALID_ROUTE_ID',
        `Unknown route_id '${routeId}'. Allowed basket routes: ${validRoutes.join(', ')}.`,
        400,
        { valid_routes: validRoutes },
        rateLimit.headers
      );
    }
  }

  // Validate Booking Window if provided
  if (bookingWindow && !isValidBookingWindow(bookingWindow)) {
    return apiError(
      'INVALID_BOOKING_WINDOW',
      `Invalid booking_window '${rawBookingWindow}'. Allowed values: 'T+1', 'T+7', 'T+15', 'T+30', 'T+45'.`,
      400,
      { allowed: ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'] },
      rateLimit.headers
    );
  }

  // Load real scraped and cleaned fare records
  const allCleaned = loadCleanedFareRecords();

  let filtered = allCleaned;

  if (routeId) {
    filtered = filtered.filter((r) => r.route_id === routeId);
  }

  if (bookingWindow) {
    filtered = filtered.filter((r) => r.booking_window === bookingWindow);
  }

  // Filter out statistical outliers from public quotes feed unless requested
  filtered = filtered.filter((r) => !r.is_outlier);

  const results = filtered.slice(0, limit);

  return apiSuccess(
    results,
    results.length,
    {
      filter_route_id: routeId || 'ALL',
      filter_booking_window: bookingWindow || 'ALL',
      total_available_in_store: filtered.length,
      data_source: 'REAL_CLEANED_FLIGHT_RECORDS',
    },
    rateLimit.headers
  );
}
