import * as path from 'path';
import {
  IndexEngineOptions,
  IndexRunResult,
  DailyIndexRecord,
} from './types';
import { RouteAggregator } from './aggregator';
import { LaspeyresIndexCalculator, DEFAULT_BASE_PERIOD_BASKET_FARE } from './laspeyres';
import { ElasticityCalculator } from './elasticity';
import { RollupCalculator } from './rollups';
import { IndexStorage } from './storage';

export class IndexComputationEngine {
  private aggregator = new RouteAggregator();
  private laspeyresCalculator: LaspeyresIndexCalculator;
  private elasticityCalculator = new ElasticityCalculator();
  private rollupCalculator = new RollupCalculator();
  private storage = new IndexStorage();

  constructor(options?: IndexEngineOptions) {
    this.laspeyresCalculator = new LaspeyresIndexCalculator(
      options?.baseBasketFare ?? DEFAULT_BASE_PERIOD_BASKET_FARE
    );
  }

  /**
   * Runs the complete index computation pipeline
   */
  public async computeIndex(options: IndexEngineOptions = {}): Promise<IndexRunResult> {
    const runId = `idx_run_${Date.now()}`;
    const calculatedAt = new Date().toISOString();
    const indexDate = options.date && options.date !== 'latest' ? options.date : calculatedAt.split('T')[0];

    console.log(`\n======================================================================`);
    console.log(`  APIx INDEX COMPUTATION ENGINE (MoSPI PS 26056)`);
    console.log(`  Run ID: ${runId}`);
    console.log(`  Index Date: ${indexDate}`);
    console.log(`  Methodology: Laspeyres Weighted Basket Index (Base = 100.00)`);
    console.log(`======================================================================\n`);

    // Step 1: Load cleaned records
    const cleanRecords = this.aggregator.loadCleanedRecords(options.date);
    console.log(`[Index Engine] Ingested ${cleanRecords.length} cleaned fare records.`);

    // Step 2: Aggregate by Route and Booking Window
    const { routeAggregations, totalOutliersExcluded, totalValidRecords } =
      this.aggregator.aggregateByRoute(cleanRecords);

    console.log(`[Index Engine ✓] Aggregated ${routeAggregations.length} DGCA corridors across T+1..T+45 windows.`);
    console.log(`                 (${totalValidRecords} valid quotes included, ${totalOutliersExcluded} IQR outliers filtered).`);

    // Step 3: Compute Laspeyres Daily Index
    const dailyIndex = this.laspeyresCalculator.computeDailyIndex(
      routeAggregations,
      indexDate
    );

    console.log(`[Index Engine ✓] Computed Daily APIx: ${dailyIndex.apix_value} (Basket: ₹${dailyIndex.raw_weighted_fare.toFixed(2)})`);

    // Step 4: Compute Lead-Time Elasticity
    const elasticityDataset = this.elasticityCalculator.computeElasticity(routeAggregations);
    console.log(`[Index Engine ✓] Calculated Advance-Purchase Elasticity Curves for ${elasticityDataset.length} routes.`);

    // Step 5: Compute Weekly & Monthly Rollups
    const weeklyIndex = this.rollupCalculator.computeWeeklyRollup([dailyIndex], indexDate);
    const monthStr = indexDate.slice(0, 7); // YYYY-MM
    const monthlyIndex = this.rollupCalculator.computeMonthlyRollup([dailyIndex], monthStr);

    // Step 6: Persist Outputs
    let outputFiles = {
      daily_index_json: '',
      elasticity_json: '',
      time_series_csv: '',
    };

    if (!options.dryRun) {
      outputFiles = await this.storage.saveIndexRun(
        dailyIndex,
        elasticityDataset,
        weeklyIndex,
        monthlyIndex
      );

      console.log(`[Index Engine ✓] Persisted outputs to:`);
      console.log(`   Daily JSON:  ${path.relative(process.cwd(), outputFiles.daily_index_json)}`);
      console.log(`   Elasticity:  ${path.relative(process.cwd(), outputFiles.elasticity_json)}`);
      console.log(`   Time Series: ${path.relative(process.cwd(), outputFiles.time_series_csv)}`);
    }

    // Step 7: Print Terminal Summary Table
    this.printSummaryTable(dailyIndex, elasticityDataset);

    return {
      run_id: runId,
      calculated_at: calculatedAt,
      daily_index: dailyIndex,
      weekly_index: weeklyIndex,
      monthly_index: monthlyIndex,
      elasticity_dataset: elasticityDataset,
      output_files: outputFiles,
    };
  }

  private printSummaryTable(daily: DailyIndexRecord, elasticity: typeof Array.prototype) {
    console.log(`\n---------------------------------------------------------------------------------------------`);
    console.log(`  DGCA ROUTE BASKET BREAKDOWN (Date: ${daily.index_date})`);
    console.log(`---------------------------------------------------------------------------------------------`);
    console.log(`  Route     Weight   T+1      T+7      T+15     T+30     T+45     Representative  Contribution`);
    console.log(`  --------- ------   -------  -------  -------  -------  -------  --------------  ------------`);

    for (const r of daily.route_breakdown) {
      const routePad = r.route_id.padEnd(9);
      const wtPad = `${(r.dgca_traffic_weight * 100).toFixed(1)}%`.padStart(6);
      const t1 = `₹${r.window_medians['T+1']}`.padStart(8);
      const t7 = `₹${r.window_medians['T+7']}`.padStart(8);
      const t15 = `₹${r.window_medians['T+15']}`.padStart(8);
      const t30 = `₹${r.window_medians['T+30']}`.padStart(8);
      const t45 = `₹${r.window_medians['T+45']}`.padStart(8);
      const rep = `₹${r.representative_daily_fare}`.padStart(13);
      const contrib = `₹${r.weighted_fare_contribution.toFixed(2)}`.padStart(13);

      console.log(`  ${routePad} ${wtPad}   ${t1} ${t7} ${t15} ${t30} ${t45}   ${rep}  ${contrib}`);
    }

    console.log(`---------------------------------------------------------------------------------------------`);
    console.log(`  TOTAL WEIGHTED BASKET FARE (CURRENT): ₹${daily.raw_weighted_fare.toFixed(2)}`);
    console.log(`  BASE PERIOD REFERENCE FARE (JAN 2026):₹${daily.base_weighted_fare.toFixed(2)}`);
    console.log(`  OFFICIAL APIx INDEX VALUE:            ${daily.apix_value} pts (24H Delta: ${daily.delta_24h && daily.delta_24h > 0 ? '+' : ''}${daily.delta_24h}%)`);
    console.log(`=============================================================================================\n`);
  }
}
