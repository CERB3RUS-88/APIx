import { DailyIndexRecord } from './types';

export class RollupCalculator {
  /**
   * Computes Weekly Rollup record from a collection of daily index values
   */
  public computeWeeklyRollup(dailyIndices: DailyIndexRecord[], indexDate: string): DailyIndexRecord {
    if (dailyIndices.length === 0) {
      throw new Error('Cannot compute weekly rollup from empty daily indices');
    }

    const apixValues = dailyIndices.map((d) => d.apix_value);
    const rawFares = dailyIndices.map((d) => d.raw_weighted_fare);
    const avgApix = Number((apixValues.reduce((a, b) => a + b, 0) / apixValues.length).toFixed(2));
    const avgRawFare = Number((rawFares.reduce((a, b) => a + b, 0) / rawFares.length).toFixed(2));
    const basePeriodVal = dailyIndices[0].base_period_value;
    const baseFare = dailyIndices[0].base_weighted_fare;

    const methodologyNotes = `Weekly APIx Rollup: Arithmetic mean of ${dailyIndices.length} daily index values (Jan 2026 Base = 100.00). Average Basket Fare: ₹${avgRawFare}.`;

    return {
      id: `weekly_index_${indexDate}`,
      index_date: indexDate,
      frequency: 'weekly',
      apix_value: avgApix,
      base_period_value: basePeriodVal,
      raw_weighted_fare: avgRawFare,
      base_weighted_fare: baseFare,
      active_routes_count: dailyIndices[0].active_routes_count,
      total_records_processed: dailyIndices.reduce((acc, d) => acc + d.total_records_processed, 0),
      outliers_excluded_count: dailyIndices.reduce((acc, d) => acc + d.outliers_excluded_count, 0),
      methodology_notes: methodologyNotes,
      route_breakdown: dailyIndices[dailyIndices.length - 1].route_breakdown,
    };
  }

  /**
   * Computes Monthly Rollup record from daily index series
   */
  public computeMonthlyRollup(dailyIndices: DailyIndexRecord[], monthString: string): DailyIndexRecord {
    const apixValues = dailyIndices.map((d) => d.apix_value);
    const rawFares = dailyIndices.map((d) => d.raw_weighted_fare);
    const avgApix = Number((apixValues.reduce((a, b) => a + b, 0) / apixValues.length).toFixed(2));
    const avgRawFare = Number((rawFares.reduce((a, b) => a + b, 0) / rawFares.length).toFixed(2));

    const methodologyNotes = `Monthly APIx Official MoSPI Rollup for ${monthString}: Synthesized from ${dailyIndices.length} daily observation points. Base period = 100.00.`;

    return {
      id: `monthly_index_${monthString}`,
      index_date: `${monthString}-01`,
      frequency: 'monthly',
      apix_value: avgApix,
      base_period_value: 100.0,
      raw_weighted_fare: avgRawFare,
      base_weighted_fare: dailyIndices[0]?.base_weighted_fare || 5280,
      active_routes_count: 10,
      total_records_processed: dailyIndices.reduce((acc, d) => acc + d.total_records_processed, 0),
      outliers_excluded_count: dailyIndices.reduce((acc, d) => acc + d.outliers_excluded_count, 0),
      methodology_notes: methodologyNotes,
      route_breakdown: dailyIndices[dailyIndices.length - 1]?.route_breakdown || [],
    };
  }
}
