import { CleanedFareRecord, OutlierGroupStats, BookingWindow } from './types';

export class OutlierDetector {
  private multiplier: number;
  private minValidFare: number;
  private maxValidFare: number;

  constructor(options?: {
    multiplier?: number;
    minValidFare?: number;
    maxValidFare?: number;
  }) {
    this.multiplier = options?.multiplier ?? 1.5;
    this.minValidFare = options?.minValidFare ?? 500;
    this.maxValidFare = options?.maxValidFare ?? 75000;
  }

  /**
   * Evaluates and tags outliers across partitioned (route_id, booking_window) buckets
   */
  public detectAndTagOutliers(records: CleanedFareRecord[]): {
    taggedRecords: CleanedFareRecord[];
    groupStats: OutlierGroupStats[];
    totalOutliers: number;
  } {
    // 1. Partition records by route_id and booking_window
    const groups = new Map<string, CleanedFareRecord[]>();

    for (const record of records) {
      const key = `${record.route_id}__${record.booking_window}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    }

    const taggedRecords: CleanedFareRecord[] = [];
    const groupStats: OutlierGroupStats[] = [];
    let totalOutliers = 0;

    // 2. Process each partition
    for (const [key, groupRecords] of groups.entries()) {
      const [routeId, bookingWindow] = key.split('__') as [string, BookingWindow];
      const fares = groupRecords.map((r) => r.total_fare).sort((a, b) => a - b);
      const count = fares.length;

      let q1 = 0;
      let median = 0;
      let q3 = 0;
      let iqr = 0;
      let lowerFence = this.minValidFare;
      let upperFence = this.maxValidFare;
      let groupOutliers = 0;

      if (count >= 4) {
        median = this.calculateQuantile(fares, 0.5);
        q1 = this.calculateQuantile(fares, 0.25);
        q3 = this.calculateQuantile(fares, 0.75);
        iqr = q3 - q1;

        // If IQR is very small (e.g. identical fares), provide a minimum 15% window around median
        const effectiveIqr = iqr > 0 ? iqr : median * 0.15;

        lowerFence = Math.max(this.minValidFare, Math.round(q1 - this.multiplier * effectiveIqr));
        upperFence = Math.min(this.maxValidFare, Math.round(q3 + this.multiplier * effectiveIqr));
      } else {
        median = fares[Math.floor(count / 2)] || 0;
        q1 = fares[0] || 0;
        q3 = fares[fares.length - 1] || 0;
        iqr = q3 - q1;
        // Conservative fallback bounds for small sample
        lowerFence = Math.max(this.minValidFare, Math.round(median * 0.4));
        upperFence = Math.min(this.maxValidFare, Math.round(median * 2.6));
      }

      // 3. Tag records against fences
      for (const rec of groupRecords) {
        let isOutlier = false;
        let reason: string | undefined = undefined;

        if (rec.total_fare < lowerFence) {
          isOutlier = true;
          reason = `Low outlier: ₹${rec.total_fare} < lower fence ₹${lowerFence} (Q1: ₹${q1}, IQR: ₹${iqr})`;
        } else if (rec.total_fare > upperFence) {
          isOutlier = true;
          reason = `High outlier: ₹${rec.total_fare} > upper fence ₹${upperFence} (Q3: ₹${q3}, IQR: ₹${iqr})`;
        }

        if (isOutlier) {
          groupOutliers++;
          totalOutliers++;
        }

        taggedRecords.push({
          ...rec,
          is_outlier: isOutlier,
          outlier_reason: reason,
        });
      }

      groupStats.push({
        route_id: routeId,
        booking_window: bookingWindow,
        count,
        q1,
        median,
        q3,
        iqr,
        lower_fence: lowerFence,
        upper_fence: upperFence,
        outlier_count: groupOutliers,
      });
    }

    return {
      taggedRecords,
      groupStats,
      totalOutliers,
    };
  }

  private calculateQuantile(sortedValues: number[], p: number): number {
    const pos = (sortedValues.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedValues[base + 1] !== undefined) {
      return Math.round(sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]));
    }
    return sortedValues[base];
  }
}
