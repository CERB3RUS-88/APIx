import { IScraperSource } from '../core/types';
import { IndiGoScraper } from './indigo';
import { EaseMyTripScraper } from './easemytrip';
import { CleartripScraper } from './cleartrip';
import { MakeMyTripScraper } from './makemytrip';

export class ScraperRegistry {
  private static instance: ScraperRegistry;
  private sources: Map<string, IScraperSource> = new Map();

  private constructor() {
    this.register(new IndiGoScraper());
    this.register(new EaseMyTripScraper());
    this.register(new CleartripScraper());
    this.register(new MakeMyTripScraper());
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
    return this.sources.get(name.toLowerCase());
  }

  public getAll(): IScraperSource[] {
    return Array.from(this.sources.values());
  }

  public getNames(): string[] {
    return Array.from(this.sources.keys());
  }
}
