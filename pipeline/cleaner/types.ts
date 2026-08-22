import { BookingWindow } from '../../scraper/core/types';

export interface CleanedFareRecord {
  id: string; // e.g. 'fare_DEL-BOM_6E_2026-08-23_T+1_...'
  route_id: string;
  source: string;
  carrier: string;
  flight_number?: string;
  flight_date: string; // YYYY-MM-DD
  booking_window: BookingWindow;
  base_fare: number;
  taxes: number;
  total_fare: number;
  scraped_at: string;
  is_outlier: boolean;
  outlier_reason?: string;
  departure_time?: string;
  is_nonstop?: boolean;
}

export interface RawSnapshotInput {
  route_id: string;
  origin?: string;
  destination?: string;
  source: string;
  booking_window: BookingWindow;
  flight_date: string;
  scraped_at: string;
  raw_payload?: Record<string, unknown>;
  quotes?: Array<Record<string, unknown>>;
}

export interface OutlierGroupStats {
  route_id: string;
  booking_window: BookingWindow;
  count: number;
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  lower_fence: number;
  upper_fence: number;
  outlier_count: number;
}

export interface CleanerOptions {
  date?: string; // specific scrape date YYYY-MM-DD or 'all'
  routes?: string[];
  windows?: BookingWindow[];
  outlierMultiplier?: number; // default 1.5
  minValidFare?: number; // default 500 INR
  maxValidFare?: number; // default 100,000 INR
  dryRun?: boolean;
  verbose?: boolean;
}

export interface ETLRunSummary {
  run_id: string;
  executed_at: string;
  snapshots_processed: number;
  total_raw_quotes_parsed: number;
  duplicates_skipped: number;
  invalid_fares_skipped: number;
  valid_records_processed: number;
  outliers_flagged: number;
  records_inserted: number;
  group_stats: OutlierGroupStats[];
  output_file?: string;
}
