import { Page, Response } from 'playwright';
import { BaseScraper } from './base-scraper';
import { ScrapeTask, RawFlightQuote } from '../core/types';

export class AirIndiaScraper extends BaseScraper {
  readonly name = 'Air India';
  readonly domain = 'https://www.airindia.com';
  readonly baseUrl = 'https://www.airindia.com';

  protected async executeExtraction(
    task: ScrapeTask,
    page: Page
  ): Promise<{
    quotes: RawFlightQuote[];
    rawPayload: Record<string, unknown>;
    interceptedApi: boolean;
  }> {
    const origin = task.route.origin_code;
    const dest = task.route.destination_code;
    const date = task.target_date; // YYYY-MM-DD

    let interceptedJson: Record<string, unknown> | null = null;
    const quotes: RawFlightQuote[] = [];

    const handleResponse = async (response: Response) => {
      const url = response.url().toLowerCase();
      if (
        (url.includes('flightsearch') ||
          url.includes('availability') ||
          url.includes('getfare') ||
          url.includes('/api/v') ||
          url.includes('airindia.com/api')) &&
        response.status() === 200
      ) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            if (data && (data.data || data.flights || data.trips || data.fares)) {
              interceptedJson = data;
            }
          }
        } catch {
          // Ignore stream consume errors
        }
      }
    };

    page.on('response', handleResponse);

    const searchUrl = `${this.baseUrl}/in/en/book-flights.html?origin=${origin}&destination=${dest}&departureDate=${date}&tripType=O&adults=1`;

    try {
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await page.waitForTimeout(4000);

      const pageTitle = (await page.title()).toLowerCase();
      if (pageTitle.includes('access denied') || pageTitle.includes('security check')) {
        throw new Error(`Bot verification encountered on ${this.name}: ${pageTitle}`);
      }

      if (interceptedJson) {
        const parsed = this.parseAirIndiaApiResponse(interceptedJson, task);
        if (parsed.length > 0) {
          quotes.push(...parsed);
        }
      }

      if (quotes.length === 0) {
        const domQuotes = await this.extractFromDom(page, task);
        quotes.push(...domQuotes);
      }

      return {
        quotes,
        rawPayload: interceptedJson || { dom_extracted_count: quotes.length, url: searchUrl },
        interceptedApi: Boolean(interceptedJson && quotes.length > 0),
      };
    } finally {
      page.off('response', handleResponse);
    }
  }

  private parseAirIndiaApiResponse(data: Record<string, unknown>, task: ScrapeTask): RawFlightQuote[] {
    const quotes: RawFlightQuote[] = [];

    try {
      const flights = (data.flights || data.schedules || data.trips || []) as Array<Record<string, unknown>>;
      for (const f of flights) {
        const flightNumber = String(f.flightNumber || f.flight_no || f.flightNo || 'AI-101');
        const carrier = flightNumber.startsWith('AI') ? 'AI' : flightNumber.startsWith('IX') ? 'IX' : 'AI';
        const baseFare = Number(f.baseFare || f.base_fare || 0);
        const tax = Number(f.taxes || f.tax || f.fee || 0);
        const total = Number(f.totalFare || f.total || f.amount || baseFare + tax);

        if (total > 0) {
          quotes.push({
            route_id: task.route.id,
            source: this.name,
            carrier,
            flight_number: flightNumber.includes('-') ? flightNumber : `AI-${flightNumber.replace(/\D/g, '')}`,
            flight_date: task.target_date,
            booking_window: task.booking_window,
            base_fare: baseFare > 0 ? baseFare : Math.round(total * 0.85),
            taxes: tax > 0 ? tax : Math.round(total * 0.15),
            total_fare: total,
            scraped_at: new Date().toISOString(),
            is_nonstop: Boolean(f.stops === 0 || f.isNonStop),
          });
        }
      }
    } catch {
      // Return whatever quotes parsed
    }

    return quotes;
  }

  private async extractFromDom(page: Page, task: ScrapeTask): Promise<RawFlightQuote[]> {
    const quotes: RawFlightQuote[] = [];

    try {
      const cards = await page.$$('.flight-card, [data-testid="flight-card"], .flight-result-item');
      for (const card of cards.slice(0, 15)) {
        const text = await card.innerText();
        const priceMatch = text.match(/₹\s*([0-9,]+)/);
        if (priceMatch) {
          const totalFare = parseInt(priceMatch[1].replace(/,/g, ''), 10);
          if (totalFare > 1000 && totalFare < 60000) {
            const flightMatch = text.match(/AI[-\s]?([0-9]{3,4})/i);
            const flightNum = flightMatch ? `AI-${flightMatch[1]}` : 'AI-Flight';

            quotes.push({
              route_id: task.route.id,
              source: this.name,
              carrier: 'AI',
              flight_number: flightNum,
              flight_date: task.target_date,
              booking_window: task.booking_window,
              base_fare: Math.round(totalFare * 0.86),
              taxes: Math.round(totalFare * 0.14),
              total_fare: totalFare,
              scraped_at: new Date().toISOString(),
              is_nonstop: !text.toLowerCase().includes('stop'),
            });
          }
        }
      }
    } catch {
      // Fallback ignore
    }

    return quotes;
  }
}
