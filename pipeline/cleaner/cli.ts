import { ETLPipeline } from './pipeline';
import { CleanerOptions } from './types';

function parseArgs(): CleanerOptions {
  const args = process.argv.slice(2);
  const options: CleanerOptions = {
    outlierMultiplier: 1.5,
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--date' && args[i + 1]) {
      options.date = args[i + 1].trim();
      i++;
    } else if (arg === '--multiplier' && args[i + 1]) {
      options.outlierMultiplier = parseFloat(args[i + 1]);
      i++;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
======================================================================
  APIx Cleaning & ETL Pipeline CLI (MoSPI SIH 2026 PS 26056)
======================================================================

Usage:
  npm run clean -- [options]

Options:
  --date <YYYY-MM-DD|all>  Process snapshots from specific date directory (default: all)
  --multiplier <float>     Tukey IQR outlier threshold multiplier (default: 1.5)
  --dry-run                Simulate cleaning without writing output files
  --verbose, -v            Output detailed per-record diagnostic logs
  --help, -h               Show this help manual

Examples:
  npm run clean
  npm run clean -- --date 2026-08-22
  npm run clean -- --multiplier 2.0 --dry-run
`);
}

async function main() {
  const options = parseArgs();
  const pipeline = new ETLPipeline(options);

  try {
    const summary = await pipeline.executePipeline(options);
    if (summary.records_inserted === 0 && summary.snapshots_processed > 0) {
      console.warn(`[ETL Alert] Zero records output from ${summary.snapshots_processed} processed snapshots.`);
    }
  } catch (error) {
    console.error(`\nFatal ETL error: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
