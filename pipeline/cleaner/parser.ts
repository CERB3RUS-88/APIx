import { RawSnapshotInput, CleanedFareRecord } from './types';

export class SnapshotParser {
  /**
   * Parses a raw snapshot input into individual candidate fare records
   */
  public parseSnapshot(snapshot: RawSnapshotInput): CleanedFareRecord[] {
    const records: CleanedFareRecord[] = [];

    // Case 1: Pre-extracted quotes in snapshot
    if (Array.isArray(snapshot.quotes) && snapshot.quotes.length > 0) {
      for (const q of snapshot.quotes) {
        const parsed = this.normalizeQuote(q, snapshot);
        if (parsed) records.push(parsed);
      }
      return records;
    }

    // Case 2: Deep raw_payload parsing
    if (snapshot.raw_payload) {
      const extracted = this.extractFromRawPayload(snapshot.raw_payload, snapshot);
      records.push(...extracted);
    }

    return records;
  }

  private normalizeQuote(
    raw: Record<string, unknown>,
    snapshot: RawSnapshotInput
  ): CleanedFareRecord | null {
    const totalFare = this.parseNumeric(raw.total_fare || raw.totalFare || raw.TotalFare || raw.price);
    if (!totalFare || totalFare <= 0) return null;

    let baseFare = this.parseNumeric(raw.base_fare || raw.baseFare || raw.BaseFare);
    let taxes = this.parseNumeric(raw.taxes || raw.Taxes || raw.tax);

    // Ensure total_fare = base_fare + taxes
    if (!baseFare && !taxes) {
      baseFare = Math.round(totalFare * 0.81);
      taxes = totalFare - baseFare;
    } else if (baseFare && !taxes) {
      taxes = Math.max(0, totalFare - baseFare);
    } else if (!baseFare && taxes) {
      baseFare = Math.max(0, totalFare - taxes);
    } else if (baseFare && taxes && baseFare + taxes !== totalFare) {
      // Reconcile taxes so total_fare is exact
      taxes = totalFare - baseFare;
    }

    const carrier = String(raw.carrier || raw.carrier_code || raw.Carrier || '6E').toUpperCase();
    const flightNumber = raw.flight_number || raw.flightNumber || raw.FltNo ? String(raw.flight_number || raw.flightNumber || raw.FltNo) : undefined;
    const departureTime = raw.departure_time || raw.departureTime || raw.DepTime ? String(raw.departure_time || raw.departureTime || raw.DepTime) : '08:00';

    return {
      id: `fare_${snapshot.route_id}_${carrier}_${snapshot.flight_date}_${snapshot.booking_window}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      route_id: snapshot.route_id,
      source: snapshot.source,
      carrier,
      flight_number: flightNumber,
      flight_date: snapshot.flight_date,
      booking_window: snapshot.booking_window,
      base_fare: baseFare!,
      taxes: taxes!,
      total_fare: totalFare,
      scraped_at: snapshot.scraped_at,
      is_outlier: false,
      departure_time: departureTime,
      is_nonstop: raw.is_nonstop !== false,
    };
  }

  private extractFromRawPayload(
    payload: Record<string, unknown>,
    snapshot: RawSnapshotInput
  ): CleanedFareRecord[] {
    const list = (payload.flights || payload.trips || payload.FlightList || payload.flightResults || payload.items || []) as Array<Record<string, unknown>>;
    const records: CleanedFareRecord[] = [];

    for (const item of list) {
      const quote = this.normalizeQuote(item, snapshot);
      if (quote) {
        records.push(quote);
      }
    }

    return records;
  }

  private parseNumeric(val: unknown): number | null {
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'string') {
      const clean = val.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }
}
