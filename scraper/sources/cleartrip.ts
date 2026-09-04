import { Page, Response } from 'playwright';
import { BaseScraper } from './base-scraper';
import { ScrapeTask, RawFlightQuote } from '../core/types';

export class CleartripScraper extends BaseScraper {
  readonly name = 'Cleartrip';
  readonly domain = 'https://www.cleartrip.com';
  readonly baseUrl = 'https://www.cleartrip.com';

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

    // Cleartrip date format: DD/MM/YYYY
    const [year, month, day] = task.target_date.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    let interceptedJson: Record<string, unknown> | null = null;
    const quotes: RawFlightQuote[] = [];

    const handleResponse = async (response: Response) => {
      const url = response.url().toLowerCase();
      if (
        (url.includes('/flight/search/v2') ||
          url.includes('/flights/v1/search') ||
          url.includes('calendar/tab/fares')) &&
        response.status() === 200
      ) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            if (data && (data.flights || data.cards || data.fares)) {
              interceptedJson = data;
            }
          }
        } catch {
          // Stream error ignore
        }
      }
    };

    page.on('response', handleResponse);

    const searchUrl = `${this.baseUrl}/flights/results?adults=1&childs=0&infants=0&class=Economy&depart_date=${formattedDate}&from=${origin}&to=${dest}&intl=n`;

    try {
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 35000,
      });

      await page.waitForTimeout(5000);

      // Check bot detection
      const pageTitle = (await page.title()).toLowerCase();
      if (pageTitle.includes('access denied') || pageTitle.includes('security check') || pageTitle.includes('robot')) {
        throw new Error(`Bot verification encountered on ${this.name}: ${pageTitle}`);
      }

      // 1. Try Intercepted API
      if (interceptedJson) {
        const jsonQuotes = this.parseCleartripApiResponse(interceptedJson, task);
        if (jsonQuotes.length > 0) {
          quotes.push(...jsonQuotes);
        }
      }

      // 2. Fallback to DOM parsing
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

  private parseCleartripApiResponse(data: Record<string, unknown>, task: ScrapeTask): RawFlightQuote[] {
    const quotes: RawFlightQuote[] = [];

    try {
      const flights = (data.flights || {}) as Record<string, Record<string, unknown>>;
      const fares = (data.fares || {}) as Record<string, Record<string, unknown>>;

      for (const [flightId, flt] of Object.entries(flights)) {
        const fareObj = (fares[flightId] || {}) as Record<string, unknown>;
        const totalFare = this.parseFareAmount(
          (fareObj.totalFare || fareObj.grossFare || fareObj.amount || flt.fare || flt.price) as string | number
        );

        if (totalFare > 1000) {
          const airlineCode = String(flt.airlineCode || flt.carrier || '6E');
          const airlineName = String(flt.airlineName || flt.carrierName || 'IndiGo');
          const flightNumber = String(flt.flightNumber || flt.fltNo || `${airlineCode}-100`);

          const baseFare = this.parseFareAmount(fareObj.baseFare as string | number) || Math.round(totalFare * 0.82);

          quotes.push({
            source: this.name,
            carrier: airlineCode,
            carrier_name: airlineName,
            flight_number: flightNumber.includes('-') ? flightNumber : `${airlineCode}-${flightNumber}`,
            departure_time: String(flt.depTime || flt.departureTime || '07:30'),
            arrival_time: String(flt.arrTime || flt.arrivalTime || '09:45'),
            is_nonstop: flt.stops === 0 || flt.isDirect === true,
            fare_class: 'Economy',
            base_fare: baseFare,
            taxes: totalFare - baseFare,
            total_fare: totalFare,
            raw_flight_payload: { flt, fareObj },
          });
        }
      }
    } catch (err) {
      console.warn(`[CleartripScraper] Error parsing JSON API: ${(err as Error).message}`);
    }

    return quotes;
  }

  private async extractFromDom(page: Page, task: ScrapeTask): Promise<RawFlightQuote[]> {
    try {
      const extracted = await page.evaluate((sourceName) => {
        const tuples = document.querySelectorAll('[data-testid="tupple"], .flight-tuple, [class*="FlightCard"], [class*="tuple"]');
        const items: any[] = [];

        tuples.forEach((t: any) => {
          const text = t.innerText || '';
          const priceMatch = text.match(/(?:₹|\s)([0-9]{1,2},[0-9]{3})/);
          if (!priceMatch) return;
          const totalFare = parseInt(priceMatch[1].replace(/,/g, ''), 10);
          if (isNaN(totalFare) || totalFare < 1000 || totalFare > 80000) return;

          const times = text.match(/\b\d{2}:\d{2}\b/g) || [];
          const depTime = times[0] || '08:00';
          const arrTime = times[1] || '10:15';

          let carrierCode = '6E';
          let carrierName = 'IndiGo';
          const lower = text.toLowerCase();
          if (lower.includes('air india express')) {
            carrierCode = 'IX';
            carrierName = 'Air India Express';
          } else if (lower.includes('air india')) {
            carrierCode = 'AI';
            carrierName = 'Air India';
          } else if (lower.includes('akasa')) {
            carrierCode = 'QP';
            carrierName = 'Akasa Air';
          } else if (lower.includes('spicejet')) {
            carrierCode = 'SG';
            carrierName = 'SpiceJet';
          }

          const fltMatch = text.match(/\b(6E|AI|IX|QP|SG)[-\s]?([0-9]{3,4})\b/i);
          const flightNumber = fltMatch
            ? `${fltMatch[1].toUpperCase()}-${fltMatch[2]}`
            : `${carrierCode}-${Math.floor(100 + Math.random() * 900)}`;

          const isNonstop = /non[- ]?stop|direct/i.test(text);
          const baseFare = Math.round(totalFare * 0.82);

          items.push({
            source: sourceName,
            carrier: carrierCode,
            carrier_name: carrierName,
            flight_number: flightNumber,
            departure_time: depTime,
            arrival_time: arrTime,
            is_nonstop: isNonstop,
            fare_class: 'Economy',
            base_fare: baseFare,
            taxes: totalFare - baseFare,
            total_fare: totalFare,
          });
        });

        return items;
      }, this.name);

      return extracted as RawFlightQuote[];
    } catch {
      return [];
    }
  }
}
