import { RouteFareAggregation, RouteElasticityData, RouteElasticityPoint } from './types';
import { BookingWindow } from '../../types';

const WINDOW_DAYS_MAP: Record<BookingWindow, number> = {
  'T+45': 45,
  'T+30': 30,
  'T+15': 15,
  'T+7': 7,
  'T+1': 1,
};

const ORDERED_WINDOWS: BookingWindow[] = ['T+45', 'T+30', 'T+15', 'T+7', 'T+1'];

export class ElasticityCalculator {
  /**
   * Computes lead-time advance-purchase elasticity curve per route
   */
  public computeElasticity(routeAggregations: RouteFareAggregation[]): RouteElasticityData[] {
    const results: RouteElasticityData[] = [];

    for (const route of routeAggregations) {
      const curve: RouteElasticityPoint[] = [];
      const t45Fare = route.window_medians['T+45'] || 4000;
      const t1Fare = route.window_medians['T+1'] || 8000;

      for (const win of ORDERED_WINDOWS) {
        const fare = route.window_medians[win] || 0;
        const count = route.window_counts[win] || 0;
        const multiplierVsT45 = Number((fare / (t45Fare || 1)).toFixed(2));
        const discountVsT1 = Number((((t1Fare - fare) / (t1Fare || 1)) * 100).toFixed(1));

        curve.push({
          booking_window: win,
          days_ahead: WINDOW_DAYS_MAP[win],
          median_fare: fare,
          average_fare: fare,
          sample_size: count,
          price_multiplier_vs_t45: multiplierVsT45,
          discount_vs_t1: discountVsT1,
        });
      }

      const t1Ratio = Number((t1Fare / (t45Fare || 1)).toFixed(2));
      const overallElasticityScore = Number(((t1Fare - t45Fare) / 44).toFixed(2)); // INR fare increase per day closer to departure

      results.push({
        route_id: route.route_id,
        origin: route.origin_code,
        destination: route.destination_code,
        curve,
        t1_to_t45_ratio: t1Ratio,
        overall_elasticity_score: overallElasticityScore,
      });
    }

    return results;
  }
}
