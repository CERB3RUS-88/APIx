import * as fs from 'fs';
import * as path from 'path';
import { ScrapeResult } from './types';

export class SnapshotStorage {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), 'data', 'snapshots');
  }

  /**
   * Persists raw snapshot to local JSON audit trail and database
   */
  public async saveSnapshot(result: ScrapeResult): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const targetDir = path.join(this.baseDir, today);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeSource = result.source.toLowerCase().replace(/[^a-z0-9]/g, '');
    const filename = `${safeSource}_${result.task.route.id}_${result.task.booking_window}_${Date.now()}.json`;
    const fullPath = path.join(targetDir, filename);

    const snapshotPayload = {
      route_id: result.task.route.id,
      origin: result.task.route.origin_code,
      destination: result.task.route.destination_code,
      source: result.source,
      booking_window: result.task.booking_window,
      flight_date: result.task.target_date,
      scraped_at: result.scraped_at,
      duration_ms: result.duration_ms,
      success: result.success,
      quotes_count: result.quotes.length,
      quotes: result.quotes,
      intercepted_api: result.intercepted_api ?? false,
      raw_payload: result.raw_payload,
      error: result.error,
    };

    await fs.promises.writeFile(fullPath, JSON.stringify(snapshotPayload, null, 2), 'utf-8');

    return fullPath;
  }

  /**
   * Save aggregate summary report of the batch run
   */
  public async saveBatchSummary(summary: unknown): Promise<string> {
    const summaryDir = path.join(process.cwd(), 'data', 'runs');
    if (!fs.existsSync(summaryDir)) {
      fs.mkdirSync(summaryDir, { recursive: true });
    }

    const filename = `run_${Date.now()}.json`;
    const fullPath = path.join(summaryDir, filename);
    await fs.promises.writeFile(fullPath, JSON.stringify(summary, null, 2), 'utf-8');
    return fullPath;
  }
}
