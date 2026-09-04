import { describe, it, expect, beforeEach } from 'vitest';
import { FareDeduplicator } from '../pipeline/cleaner/deduplicator';
import { OutlierDetector } from '../pipeline/cleaner/outlier-detector';
import { CleanedFareRecord } from '../pipeline/cleaner/types';

describe('FareDeduplicator', () => {
  let deduplicator: FareDeduplicator;

  beforeEach(() => {
    deduplicator = new FareDeduplicator();
  });

  const createSampleRecord = (overrides: Partial<CleanedFareRecord> = {}): CleanedFareRecord => ({
    id: 'rec_1',
    route_id: 'DEL-BOM',
    origin_code: 'DEL',
    destination_code: 'BOM',
    carrier: '6E',
    flight_number: '6E-501',
    departure_time: '06:00',
    arrival_time: '08:15',
    flight_date: '2026-08-23',
    booking_window: 'T+1',
    source: 'EaseMyTrip',
    source_url: 'https://flight.easemytrip.com',
    scraped_at: '2026-08-22T10:00:00.000Z',
    fare_class: 'Economy',
    base_fare: 6500,
    taxes: 799,
    total_fare: 7299,
    currency: 'INR',
    cabin_class: 'ECONOMY',
    seats_remaining: 5,
    is_outlier: false,
    ...overrides,
  });

  it('generates consistent composite keys for flight duplicates', () => {
    const rec1 = createSampleRecord({ flight_number: '6E-501' });
    const rec2 = createSampleRecord({ flight_number: '6E-501' });
    expect(deduplicator.getCompositeKey(rec1)).toBe(deduplicator.getCompositeKey(rec2));
    expect(deduplicator.getCompositeKey(rec1)).toBe('DEL-BOM#6E#2026-08-23#T+1#EaseMyTrip#Economy#6E-501');
  });

  it('filters out duplicate records with identical flight identifiers in a batch', () => {
    const rec1 = createSampleRecord({ id: 'rec_1', flight_number: '6E-501' });
    const rec2 = createSampleRecord({ id: 'rec_2', flight_number: '6E-501', total_fare: 7299 });
    const rec3 = createSampleRecord({ id: 'rec_3', flight_number: '6E-502', departure_time: '14:00' });

    const result = deduplicator.deduplicate([rec1, rec2, rec3]);

    expect(result.unique.length).toBe(2);
    expect(result.duplicatesCount).toBe(1);
    expect(result.unique.map((r) => r.id)).toEqual(['rec_1', 'rec_3']);
  });

  it('retains flights with different carriers or flight numbers', () => {
    const flight1 = createSampleRecord({ id: 'rec_1', carrier: '6E', flight_number: '6E-101' });
    const flight2 = createSampleRecord({ id: 'rec_2', carrier: 'AI', flight_number: 'AI-802' });
    const flight3 = createSampleRecord({ id: 'rec_3', carrier: 'QP', flight_number: 'QP-1103' });

    const result = deduplicator.deduplicate([flight1, flight2, flight3]);

    expect(result.unique.length).toBe(3);
    expect(result.duplicatesCount).toBe(0);
  });

  it('resets seen cache when reset() is called', () => {
    const rec1 = createSampleRecord({ flight_number: '6E-501' });
    const firstRun = deduplicator.deduplicate([rec1]);
    expect(firstRun.unique.length).toBe(1);

    // Second run without reset treats it as duplicate
    const secondRun = deduplicator.deduplicate([rec1]);
    expect(secondRun.unique.length).toBe(0);
    expect(secondRun.duplicatesCount).toBe(1);

    // After reset, it is treated as unique again
    deduplicator.reset();
    const thirdRun = deduplicator.deduplicate([rec1]);
    expect(thirdRun.unique.length).toBe(1);
  });
});

describe('OutlierDetector (Tukey IQR)', () => {
  let detector: OutlierDetector;

  beforeEach(() => {
    detector = new OutlierDetector({ multiplier: 1.5, minValidFare: 500, maxValidFare: 75000 });
  });

  const createRecordsForFares = (routeId: string, window: 'T+1' | 'T+7' | 'T+15' | 'T+30' | 'T+45', fares: number[]): CleanedFareRecord[] => {
    return fares.map((fare, idx) => ({
      id: `${routeId}_${window}_${idx}`,
      route_id: routeId,
      origin_code: routeId.split('-')[0],
      destination_code: routeId.split('-')[1],
      carrier: '6E',
      flight_number: `6E-${100 + idx}`,
      departure_time: '10:00',
      arrival_time: '12:00',
      flight_date: '2026-08-23',
      booking_window: window,
      source: 'EaseMyTrip',
      source_url: 'https://flight.easemytrip.com',
      scraped_at: '2026-08-22T10:00:00.000Z',
      fare_class: 'Economy',
      base_fare: Math.round(fare * 0.85),
      taxes: Math.round(fare * 0.15),
      total_fare: fare,
      currency: 'INR',
      cabin_class: 'ECONOMY',
      is_outlier: false,
    }));
  };

  it('correctly calculates quantiles, IQR, and tags extreme outliers', () => {
    // Normal cluster around ₹5,000 - ₹7,000 with 1 extreme low (₹200) and 1 extreme high (₹85,000)
    const fares = [
      200,    // Low outlier (< minValidFare or lower fence)
      5000,
      5200,
      5400,
      5500,
      5800,
      6000,
      6200,
      6500,
      6800,
      7000,
      85000,  // High outlier (> maxValidFare or upper fence)
    ];

    const records = createRecordsForFares('DEL-BOM', 'T+15', fares);
    const result = detector.detectAndTagOutliers(records);

    expect(result.totalOutliers).toBe(2);

    const lowOutlier = result.taggedRecords.find((r) => r.total_fare === 200);
    expect(lowOutlier?.is_outlier).toBe(true);
    expect(lowOutlier?.outlier_reason).toContain('Low outlier');

    const highOutlier = result.taggedRecords.find((r) => r.total_fare === 85000);
    expect(highOutlier?.is_outlier).toBe(true);
    expect(highOutlier?.outlier_reason).toContain('High outlier');

    const normalRecord = result.taggedRecords.find((r) => r.total_fare === 5800);
    expect(normalRecord?.is_outlier).toBe(false);
    expect(normalRecord?.outlier_reason).toBeUndefined();
  });

  it('partitions records independently by route and booking window', () => {
    // T+1 fares for DEL-BLR naturally higher (₹12,000 - ₹15,000)
    const delBlrT1 = createRecordsForFares('DEL-BLR', 'T+1', [12000, 12500, 13000, 13500, 14000, 15000]);
    // T+45 fares for BOM-PNQ naturally lower (₹2,500 - ₹3,500)
    const bomPnqT45 = createRecordsForFares('BOM-PNQ', 'T+45', [2500, 2600, 2800, 3000, 3200, 3500]);

    const combined = [...delBlrT1, ...bomPnqT45];
    const result = detector.detectAndTagOutliers(combined);

    expect(result.groupStats.length).toBe(2);
    expect(result.totalOutliers).toBe(0); // All in-range for their respective partitions

    const delBlrStats = result.groupStats.find((g) => g.route_id === 'DEL-BLR' && g.booking_window === 'T+1');
    expect(delBlrStats?.median).toBeGreaterThan(12000);

    const bomPnqStats = result.groupStats.find((g) => g.route_id === 'BOM-PNQ' && g.booking_window === 'T+45');
    expect(bomPnqStats?.median).toBeLessThan(3500);
  });

  it('handles small sample partitions gracefully with conservative fences', () => {
    const smallFares = [4500, 5000, 5500]; // 3 records (< 4)
    const records = createRecordsForFares('MAA-DEL', 'T+7', smallFares);

    const result = detector.detectAndTagOutliers(records);
    expect(result.taggedRecords.length).toBe(3);
    expect(result.totalOutliers).toBe(0);
  });
});
