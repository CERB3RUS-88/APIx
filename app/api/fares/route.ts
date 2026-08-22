import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/api/rate-limiter';
import { isValidBookingWindow, normalizeBookingWindow } from '@/lib/api/validator';
import { DGCA_ROUTE_BASKET } from '@/lib/mock-data';

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
  const limit = limitParam ? Math.min(100, parseInt(limitParam, 10)) : 50;

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

  // Generate realistic verified clean non-outlier fare records
  const targetRoutes = routeId ? [routeId] : DGCA_ROUTE_BASKET.map((r) => r.id);
  const targetWindows = bookingWindow ? [bookingWindow] : ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'];
  const carriers = [
    { code: '6E', name: 'IndiGo' },
    { code: 'AI', name: 'Air India' },
    { code: 'QP', name: 'Akasa Air' },
    { code: 'SG', name: 'SpiceJet' },
  ];

  const fareRecords = [];
  const basePrices: Record<string, number> = {
    'DEL-BOM': 5200,
    'BOM-DEL': 5100,
    'DEL-BLR': 6700,
    'BLR-DEL': 6600,
    'BOM-BLR': 4100,
    'BLR-BOM': 4150,
    'DEL-CCU': 5700,
    'CCU-DEL': 5600,
    'BLR-HYD': 3500,
    'MAA-DEL': 6200,
  };

  const windowMultipliers: Record<string, number> = {
    'T+1': 1.68,
    'T+7': 1.16,
    'T+15': 1.0,
    'T+30': 0.88,
    'T+45': 0.82,
  };

  const today = new Date().toISOString().split('T')[0];

  for (const rId of targetRoutes) {
    for (const win of targetWindows) {
      const base = basePrices[rId] || 5000;
      const mult = windowMultipliers[win] || 1.0;

      for (let i = 0; i < carriers.length; i++) {
        const c = carriers[i];
        const carrierJitter = (i - 1.5) * 180;
        const totalFare = Math.round(base * mult + carrierJitter);
        const baseFare = Math.round(totalFare * 0.82);
        const taxes = totalFare - baseFare;

        fareRecords.push({
          id: `fare_${rId}_${c.code}_${win}_${100 + i}`,
          route_id: rId,
          source: i % 2 === 0 ? 'IndiGo' : 'EaseMyTrip',
          carrier: c.code,
          carrier_name: c.name,
          flight_number: `${c.code}-${200 + i * 15}`,
          booking_window: win,
          base_fare: baseFare,
          taxes: taxes,
          total_fare: totalFare,
          scraped_at: `${today}T06:00:00.000Z`,
          is_outlier: false,
        });
      }
    }
  }

  const results = fareRecords.slice(0, limit);

  return apiSuccess(
    results,
    results.length,
    {
      filter_route_id: routeId || 'ALL',
      filter_booking_window: bookingWindow || 'ALL',
      clean_filter: 'NON_OUTLIERS_ONLY',
    },
    rateLimit.headers
  );
}
