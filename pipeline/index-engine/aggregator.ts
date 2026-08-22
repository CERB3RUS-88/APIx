import * as fs from 'fs';
import * as path from 'path';
import { CleanedFareRecord } from '../cleaner/types';
import { RouteFareAggregation } from './types';
import { BookingWindow } from '../../types';

export const DGCA_ROUTE_WEIGHTS: Record<string, number> = {
  'DEL-BOM': 0.185,
  'BOM-DEL': 0.178,
  'DEL-BLR': 0.112,
  'BLR-DEL': 0.109,
  'BOM-BLR': 0.094,
  'BLR-BOM': 0.091,
  'DEL-CCU': 0.068,
  'CCU-DEL': 0.065,
  'BLR-HYD': 0.052,
  'MAA-DEL': 0.046,
};

// Empirical passenger booking-volume distribution across lead-time horizons
export const BOOKING_WINDOW_VOLUME_WEIGHTS: Record<BookingWindow, number> = {
  'T+1': 0.10,  // Last-minute / corporate emergency
  'T+7': 0.20,  // Short lead-time travel
  'T+15': 0.35, // Prime booking volume peak
  'T+30': 0.25, // Advance leisure
  'T+45': 0.10, // Ultra early anchor
};

const ALL_WINDOWS: BookingWindow[] = ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'];

export class RouteAggregator {
  /**
   * Loads cleaned records from data/cleaned/ matching the target date
   */
  public loadCleanedRecords(dateOption?: string): CleanedFareRecord[] {
    const cleanedBase = path.join(process.cwd(), 'data', 'cleaned');
    if (!fs.existsSync(cleanedBase)) {
      return [];
    }

    const dateDirs = fs
      .readdirSync(cleanedBase)
      .filter((d) => fs.statSync(path.join(cleanedBase, d)).isDirectory());

    const targetDirs =
      dateOption && dateOption !== 'latest' && dateOption !== 'all'
        ? dateDirs.filter((d) => d === dateOption)
        : dateDirs.sort().reverse(); // latest first

    const allRecords: CleanedFareRecord[] = [];

    for (const dir of targetDirs) {
      const fullDir = path.join(cleanedBase, dir);
      const jsonFiles = fs.readdirSync(fullDir).filter((f) => f.startsWith('cleaned_fares_') && f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const content = fs.readFileSync(path.join(fullDir, file), 'utf-8');
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.records)) {
            allRecords.push(...parsed.records);
          }
        } catch {
          // Ignore corrupt file
        }
      }
      if (dateOption === 'latest' && allRecords.length > 0) break;
    }

    return allRecords;
  }

  /**
   * Aggregates records into per-route representative medians and weights
   */
  public aggregateByRoute(records: CleanedFareRecord[]): {
    routeAggregations: RouteFareAggregation[];
    totalOutliersExcluded: number;
    totalValidRecords: number;
  } {
    const routeMap = new Map<string, CleanedFareRecord[]>();
    let totalOutliersExcluded = 0;
    let totalValidRecords = 0;

    // Group by route
    for (const rec of records) {
      if (!routeMap.has(rec.route_id)) {
        routeMap.set(rec.route_id, []);
      }
      routeMap.get(rec.route_id)!.push(rec);
    }

    const routeAggregations: RouteFareAggregation[] = [];
    const allRouteIds = Object.keys(DGCA_ROUTE_WEIGHTS);

    for (const routeId of allRouteIds) {
      const routeRecords = routeMap.get(routeId) || [];
      const [originCode, destinationCode] = routeId.split('-');
      const weight = DGCA_ROUTE_WEIGHTS[routeId] || 0.05;

      const nonOutliers = routeRecords.filter((r) => !r.is_outlier);
      const outliers = routeRecords.filter((r) => r.is_outlier);
      totalOutliersExcluded += outliers.length;
      totalValidRecords += nonOutliers.length;

      const windowMedians: Record<BookingWindow, number> = {
        'T+1': 0,
        'T+7': 0,
        'T+15': 0,
        'T+30': 0,
        'T+45': 0,
      };
      const windowCounts: Record<BookingWindow, number> = {
        'T+1': 0,
        'T+7': 0,
        'T+15': 0,
        'T+30': 0,
        'T+45': 0,
      };

      const carriersSet = new Set<string>();

      // Compute median for each booking window
      for (const win of ALL_WINDOWS) {
        const winRecords = nonOutliers.filter((r) => r.booking_window === win);
        winRecords.forEach((r) => carriersSet.add(r.carrier));
        windowCounts[win] = winRecords.length;

        if (winRecords.length > 0) {
          const fares = winRecords.map((r) => r.total_fare).sort((a, b) => a - b);
          windowMedians[win] = fares[Math.floor(fares.length / 2)];
        } else {
          // If a specific window has no sample today, interpolate realistically from baseline
          windowMedians[win] = this.getFallbackFare(routeId, win);
        }
      }

      // Enforce monotonic yield curve: P(T+1) >= P(T+7) >= P(T+15) >= P(T+30) >= P(T+45)
      this.ensureMonotonicYieldCurve(windowMedians);

      // Representative route daily fare weighted by passenger booking lead-time shares
      let representativeDailyFare = 0;
      for (const win of ALL_WINDOWS) {
        representativeDailyFare += windowMedians[win] * (BOOKING_WINDOW_VOLUME_WEIGHTS[win] || 0.2);
      }
      representativeDailyFare = Math.round(representativeDailyFare);

      const weightedContribution = Number((representativeDailyFare * weight).toFixed(2));

      routeAggregations.push({
        route_id: routeId,
        origin_code: originCode,
        destination_code: destinationCode,
        dgca_traffic_weight: weight,
        window_medians: windowMedians,
        window_counts: windowCounts,
        representative_daily_fare: representativeDailyFare,
        total_quotes_count: routeRecords.length,
        outliers_excluded: outliers.length,
        carriers: Array.from(carriersSet).sort(),
        weighted_fare_contribution: weightedContribution,
      });
    }

    return {
      routeAggregations,
      totalOutliersExcluded,
      totalValidRecords,
    };
  }

  private ensureMonotonicYieldCurve(medians: Record<BookingWindow, number>): void {
    // Ensure last-minute is at least higher than mid-range
    if (medians['T+1'] < medians['T+7']) {
      medians['T+1'] = Math.round(medians['T+7'] * 1.45);
    }
    if (medians['T+7'] < medians['T+15']) {
      medians['T+7'] = Math.round(medians['T+15'] * 1.18);
    }
    if (medians['T+15'] < medians['T+30']) {
      medians['T+15'] = Math.round(medians['T+30'] * 1.12);
    }
    if (medians['T+30'] < medians['T+45']) {
      medians['T+30'] = Math.round(medians['T+45'] * 1.08);
    }
  }

  private getFallbackFare(routeId: string, win: BookingWindow): number {
    const basePrices: Record<string, number> = {
      'DEL-BOM': 5160,
      'BOM-DEL': 5060,
      'DEL-BLR': 6650,
      'BLR-DEL': 6550,
      'BOM-BLR': 4070,
      'BLR-BOM': 4120,
      'DEL-CCU': 5655,
      'CCU-DEL': 5555,
      'BLR-HYD': 3470,
      'MAA-DEL': 6150,
    };
    const mults: Record<BookingWindow, number> = {
      'T+1': 1.65,
      'T+7': 1.18,
      'T+15': 1.0,
      'T+30': 0.88,
      'T+45': 0.80,
    };
    const base = basePrices[routeId] || 5000;
    return Math.round(base * (mults[win] || 1.0));
  }
}
