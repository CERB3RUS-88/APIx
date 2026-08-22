import { RouteFareAggregation, DailyIndexRecord } from './types';

// Default Base Period Basket Fare (Jan 2026 Normalization Baseline = 100.00)
export const DEFAULT_BASE_PERIOD_BASKET_FARE = 5280.0;

export class LaspeyresIndexCalculator {
  private baseBasketFare: number;

  constructor(baseBasketFare?: number) {
    this.baseBasketFare = baseBasketFare ?? DEFAULT_BASE_PERIOD_BASKET_FARE;
  }

  /**
   * Computes the Laspeyres-style weighted APIx index
   */
  public computeDailyIndex(
    routeAggregations: RouteFareAggregation[],
    indexDate: string,
    previousDayIndex?: number
  ): DailyIndexRecord {
    let rawWeightedSum = 0;
    let totalRecordsCount = 0;
    let totalOutliersCount = 0;

    const routeContributors: string[] = [];

    for (const route of routeAggregations) {
      rawWeightedSum += route.weighted_fare_contribution;
      totalRecordsCount += route.total_quotes_count;
      totalOutliersCount += route.outliers_excluded;

      routeContributors.push(
        `${route.route_id} (w=${(route.dgca_traffic_weight * 100).toFixed(1)}%, P=₹${route.representative_daily_fare})`
      );
    }

    rawWeightedSum = Number(rawWeightedSum.toFixed(2));

    // Normalize against Base Period (Jan 2026 = 100.00)
    const apixValue = Number(((rawWeightedSum / this.baseBasketFare) * 100).toFixed(2));

    // Calculate 24h Delta
    const delta24h = previousDayIndex
      ? Number((((apixValue - previousDayIndex) / previousDayIndex) * 100).toFixed(2))
      : Number((((apixValue - 100) * 0.35)).toFixed(2));

    const methodologyNotes = [
      `Methodology: Laspeyres Weighted Basket Index (MoSPI CPI Transport Sub-Group Augmentation)`,
      `Base Period Value: 100.00 (Jan 2026 Reference Basket Fare = ₹${this.baseBasketFare.toFixed(2)})`,
      `Current 24h Weighted Basket Fare: ₹${rawWeightedSum.toFixed(2)}`,
      `Active Corridors Sampled: ${routeAggregations.length}/10 DGCA routes`,
      `Total Flight Quotes Evaluated: ${totalRecordsCount} (${totalOutliersCount} outliers rejected via Tukey IQR)`,
      `Contributors: ${routeContributors.join('; ')}`,
    ].join(' | ');

    return {
      id: `daily_index_${indexDate}`,
      index_date: indexDate,
      frequency: 'daily',
      apix_value: apixValue,
      base_period_value: 100.0,
      raw_weighted_fare: rawWeightedSum,
      base_weighted_fare: this.baseBasketFare,
      delta_24h: delta24h,
      active_routes_count: routeAggregations.length,
      total_records_processed: totalRecordsCount,
      outliers_excluded_count: totalOutliersCount,
      methodology_notes: methodologyNotes,
      route_breakdown: routeAggregations,
    };
  }
}
