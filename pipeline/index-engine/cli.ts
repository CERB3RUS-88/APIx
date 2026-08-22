import { IndexComputationEngine } from './engine';
import { IndexEngineOptions } from './types';

function parseArgs(): IndexEngineOptions {
  const args = process.argv.slice(2);
  const options: IndexEngineOptions = {
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--date' && args[i + 1]) {
      options.date = args[i + 1].trim();
      i++;
    } else if (arg === '--base-fare' && args[i + 1]) {
      options.baseBasketFare = parseFloat(args[i + 1]);
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
  APIx Index Computation Engine CLI (MoSPI SIH 2026 PS 26056)
======================================================================

Usage:
  npm run compute-index -- [options]

Options:
  --date <YYYY-MM-DD|latest>  Target date for index calculation (default: today / latest)
  --base-fare <INR>           Base period reference basket fare (default: 5280 INR = 100.00)
  --dry-run                   Calculate index without saving to disk / database
  --verbose, -v               Output granular per-window calculations
  --help, -h                  Show this help manual

Examples:
  npm run compute-index
  npm run compute-index -- --date 2026-08-22
  npm run compute-index -- --base-fare 5250 --dry-run
`);
}

async function main() {
  const options = parseArgs();
  const engine = new IndexComputationEngine(options);

  try {
    const result = await engine.computeIndex(options);
    console.log(`[APIx Engine] Successfully computed APIx index for ${result.daily_index.index_date}: ${result.daily_index.apix_value}`);
  } catch (error) {
    console.error(`\nFatal Index Engine error: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
