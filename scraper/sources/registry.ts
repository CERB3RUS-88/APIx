import { IScraperSource } from '../core/types';
import { EaseMyTripScraper } from './easemytrip';
import { CleartripScraper } from './cleartrip';
import { AkasaScraper } from './akasa';
import { AirIndiaScraper } from './airindia';

export class ScraperRegistry {
  private static instance: ScraperRegistry;
  private sources: Map<string, IScraperSource> = new Map();

  private constructor() {
    // Active compliant scraper sources only
    this.register(new EaseMyTripScraper());
    this.register(new CleartripScraper());
    this.register(new AkasaScraper());
    this.register(new AirIndiaScraper());
  }

  public static getInstance(): ScraperRegistry {
    if (!ScraperRegistry.instance) {
      ScraperRegistry.instance = new ScraperRegistry();
    }
    return ScraperRegistry.instance;
  }

  public register(scraper: IScraperSource) {
    this.sources.set(scraper.name.toLowerCase(), scraper);
  }

  public get(name: string): IScraperSource | undefined {
    const key = name.toLowerCase().replace(/[-_ ]/g, '');
    for (const [k, v] of this.sources.entries()) {
      if (k.replace(/[-_ ]/g, '') === key) {
        return v;
      }
    }
    return this.sources.get(name.toLowerCase());
  }

  public getAll(): IScraperSource[] {
    return Array.from(this.sources.values());
  }

  public getNames(): string[] {
    return Array.from(this.sources.keys());
  }
}
