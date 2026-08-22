/**
 * Transparent, honest User-Agent identity for MoSPI / SIH 2026 APIx research crawler
 */
export const APIX_BOT_IDENTITY = {
  name: 'APIx-PriceIndex-Bot',
  version: '1.0',
  url: 'https://apix.gov.in/bot',
  contact: 'research@apix.gov.in',
  purpose: 'MoSPI SIH 2026 PS 26056 - High-Frequency Consumer Price Index Augmentation',
};

export const HONEST_USER_AGENT = 
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 APIx-PriceIndex-Bot/1.0 (+https://apix.gov.in/bot; MoSPI SIH 2026)`;

export const DEFAULT_HEADERS = {
  'User-Agent': HONEST_USER_AGENT,
  'Accept': 'application/json, text/plain, text/html, */*',
  'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
  'X-Purpose': 'Price Index Research (MoSPI PS 26056)',
};
