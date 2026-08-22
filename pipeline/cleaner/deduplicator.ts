import { CleanedFareRecord } from './types';

export class FareDeduplicator {
  private seenHashes: Set<string> = new Set();

  /**
   * Generates unique composite deduplication key
   */
  public getCompositeKey(record: CleanedFareRecord): string {
    const flightIdentifier = record.flight_number || record.departure_time || 'std';
    return `${record.route_id}#${record.carrier}#${record.flight_date}#${record.booking_window}#${record.source}#${flightIdentifier}`;
  }

  /**
   * Filters out duplicates within the current batch and across already indexed records
   */
  public deduplicate(records: CleanedFareRecord[]): {
    unique: CleanedFareRecord[];
    duplicatesCount: number;
  } {
    const unique: CleanedFareRecord[] = [];
    let duplicatesCount = 0;

    for (const rec of records) {
      const key = this.getCompositeKey(rec);
      if (this.seenHashes.has(key)) {
        duplicatesCount++;
      } else {
        this.seenHashes.add(key);
        unique.push(rec);
      }
    }

    return { unique, duplicatesCount };
  }

  public reset() {
    this.seenHashes.clear();
  }
}
