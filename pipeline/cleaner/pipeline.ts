import * as fs from 'fs';
import * as path from 'path';
import {
  RawSnapshotInput,
  CleanedFareRecord,
  CleanerOptions,
  ETLRunSummary,
} from './types';
import { SnapshotParser } from './parser';
import { FareDeduplicator } from './deduplicator';
import { OutlierDetector } from './outlier-detector';
import { CleanedFareStorage } from './fare-storage';

export class ETLPipeline {
  private parser = new SnapshotParser();
  private deduplicator = new FareDeduplicator();
  private outlierDetector: OutlierDetector;
  private storage = new CleanedFareStorage();

  constructor(options?: CleanerOptions) {
    this.outlierDetector = new OutlierDetector({
      multiplier: options?.outlierMultiplier ?? 1.5,
      minValidFare: options?.minValidFare ?? 500,
      maxValidFare: options?.maxValidFare ?? 75000,
    });
  }

  /**
   * Discovers snapshot files to clean based on options
   */
  public findSnapshotFiles(dateOption?: string): string[] {
    const snapshotsBase = path.join(process.cwd(), 'data', 'snapshots');
    if (!fs.existsSync(snapshotsBase)) {
      return [];
    }

    const files: string[] = [];
    const dateDirs = fs
      .readdirSync(snapshotsBase)
      .filter((d) => fs.statSync(path.join(snapshotsBase, d)).isDirectory());

    const targetDirs =
      dateOption && dateOption !== 'all'
        ? dateDirs.filter((d) => d === dateOption)
        : dateDirs.sort().reverse(); // recent first

    for (const dir of targetDirs) {
      const fullDir = path.join(snapshotsBase, dir);
      const entries = fs.readdirSync(fullDir).filter((f) => f.endsWith('.json'));
      for (const entry of entries) {
        files.push(path.join(fullDir, entry));
      }
    }

    return files;
  }

  /**
   * Runs the full cleaning and normalization ETL pipeline
   */
  public async executePipeline(options: CleanerOptions = {}): Promise<ETLRunSummary> {
    const runId = `etl_${Date.now()}`;
    const executedAt = new Date().toISOString();

    console.log(`\n======================================================================`);
    console.log(`  APIx DATA CLEANING & ETL PIPELINE (MoSPI PS 26056)`);
    console.log(`  Run ID: ${runId}`);
    console.log(`  Executed At: ${executedAt}`);
    console.log(`  IQR Outlier Multiplier: ${options.outlierMultiplier ?? 1.5}x`);
    console.log(`======================================================================\n`);

    const snapshotFiles = this.findSnapshotFiles(options.date);
    console.log(`[ETL Ingestion] Discovered ${snapshotFiles.length} raw snapshot file(s) to process.`);

    if (snapshotFiles.length === 0) {
      console.warn(`[ETL Ingestion] No raw snapshot files found. Run 'npm run scrape' first.`);
      return {
        run_id: runId,
        executed_at: executedAt,
        snapshots_processed: 0,
        total_raw_quotes_parsed: 0,
        duplicates_skipped: 0,
        invalid_fares_skipped: 0,
        valid_records_processed: 0,
        outliers_flagged: 0,
        records_inserted: 0,
        group_stats: [],
      };
    }

    let rawQuotesParsed = 0;
    let invalidFaresSkipped = 0;
    const candidateRecords: CleanedFareRecord[] = [];

    // Stage 1 & 2: Ingestion & Parsing
    for (const filePath of snapshotFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const snapshot: RawSnapshotInput = JSON.parse(content);

        const parsed = this.parser.parseSnapshot(snapshot);
        rawQuotesParsed += (snapshot.quotes?.length || 1);

        for (const record of parsed) {
          // Filter out missing/invalid price data
          if (record.total_fare <= 0 || record.base_fare <= 0 || isNaN(record.total_fare)) {
            invalidFaresSkipped++;
            continue;
          }
          candidateRecords.push(record);
        }
      } catch (err) {
        console.warn(`[ETL Parser] Could not parse file ${path.basename(filePath)}: ${(err as Error).message}`);
      }
    }

    console.log(`[ETL Parser ✓] Extracted ${candidateRecords.length} candidate flight fare entries (skipped ${invalidFaresSkipped} invalid/zero quotes).`);

    // Stage 3: Deduplication
    this.deduplicator.reset();
    const { unique, duplicatesCount } = this.deduplicator.deduplicate(candidateRecords);
    console.log(`[ETL Deduplication ✓] Dropped ${duplicatesCount} duplicate entries. ${unique.length} unique quotes retained.`);

    // Stage 4: Outlier Detection (Tukey IQR)
    const { taggedRecords, groupStats, totalOutliers } = this.outlierDetector.detectAndTagOutliers(unique);
    console.log(`[ETL Outliers ✓] Evaluated ${groupStats.length} (route × window) partitions. Flagged ${totalOutliers} statistical outlier(s).`);

    // Stage 5: Persistence
    const summary: ETLRunSummary = {
      run_id: runId,
      executed_at: executedAt,
      snapshots_processed: snapshotFiles.length,
      total_raw_quotes_parsed: rawQuotesParsed,
      duplicates_skipped: duplicatesCount,
      invalid_fares_skipped: invalidFaresSkipped,
      valid_records_processed: unique.length,
      outliers_flagged: totalOutliers,
      records_inserted: taggedRecords.length,
      group_stats: groupStats,
    };

    if (!options.dryRun) {
      const { jsonPath, csvPath } = await this.storage.saveCleanedRecords(taggedRecords, summary);
      summary.output_file = jsonPath;
      console.log(`[ETL Storage ✓] Saved cleaned records to:`);
      console.log(`   JSON: ${path.relative(process.cwd(), jsonPath)}`);
      console.log(`   CSV:  ${path.relative(process.cwd(), csvPath)}`);
    } else {
      console.log(`[ETL Storage] DRY-RUN enabled: skipped writing to disk/database.`);
    }

    // Print Partition Statistics Summary Table
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`  PARTITION SUMMARY (Median & IQR Fences)`);
    console.log(`----------------------------------------------------------------------`);
    console.log(`  Route     Win    Quotes   Median      IQR Fence (Low - High)    Outliers`);
    console.log(`  --------- -----  ------   -------     ----------------------    --------`);
    for (const stat of groupStats.slice(0, 15)) {
      const routePad = stat.route_id.padEnd(9);
      const winPad = stat.booking_window.padEnd(6);
      const cntPad = String(stat.count).padStart(5);
      const medPad = `₹${stat.median}`.padStart(9);
      const fencePad = `₹${stat.lower_fence} - ₹${stat.upper_fence}`.padStart(22);
      const outPad = String(stat.outlier_count).padStart(8);
      console.log(`  ${routePad} ${winPad} ${cntPad} ${medPad}   ${fencePad}    ${outPad}`);
    }
    if (groupStats.length > 15) {
      console.log(`  ... and ${groupStats.length - 15} more partitions.`);
    }

    console.log(`\n======================================================================`);
    console.log(`  ETL PIPELINE SUMMARY`);
    console.log(`  Raw Snapshots Ingested:   ${summary.snapshots_processed}`);
    console.log(`  Raw Quotes Extracted:     ${summary.total_raw_quotes_parsed}`);
    console.log(`  Duplicates Removed:       ${summary.duplicates_skipped}`);
    console.log(`  Invalid/Zero Dropped:     ${summary.invalid_fares_skipped}`);
    console.log(`  Clean Records Output:     ${summary.records_inserted}`);
    console.log(`  Outliers Tagged (Audited):${summary.outliers_flagged} (${((summary.outliers_flagged / (summary.records_inserted || 1)) * 100).toFixed(1)}%)`);
    console.log(`======================================================================\n`);

    return summary;
  }
}
