'use client';

import * as React from 'react';
import { Panel, PanelHeader, PanelContent } from '@/components/ui/panel';
import { SectionHeader } from '@/components/ui/section-header';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, Play, Globe, Shield, Terminal, ArrowRight } from 'lucide-react';

interface EndpointSpec {
  method: 'GET';
  path: string;
  title: string;
  description: string;
  params: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: string;
    description: string;
  }>;
  exampleQuery: string;
  exampleResponse: Record<string, unknown>;
}

const ENDPOINTS: EndpointSpec[] = [
  {
    method: 'GET',
    path: '/api/index',
    title: 'Query Airfare Price Index Time Series',
    description:
      'Fetches high-frequency APIx index values across daily, weekly, or monthly aggregations within an optional ISO date range.',
    params: [
      {
        name: 'frequency',
        type: 'string',
        required: false,
        default: 'daily',
        description: "Aggregation frequency: 'daily' | 'weekly' | 'monthly'.",
      },
      {
        name: 'from',
        type: 'string (YYYY-MM-DD)',
        required: false,
        description: 'Start date filter (inclusive).',
      },
      {
        name: 'to',
        type: 'string (YYYY-MM-DD)',
        required: false,
        description: 'End date filter (inclusive).',
      },
      {
        name: 'limit',
        type: 'integer',
        required: false,
        default: '365',
        description: 'Maximum number of data points to return.',
      },
    ],
    exampleQuery: '/api/index?frequency=daily&limit=3',
    exampleResponse: {
      data: [
        {
          index_date: '2026-08-20',
          frequency: 'daily',
          apix_value: 104.15,
          base_period_value: 100.0,
          raw_weighted_fare: 5499,
          delta_24h: 0.65,
          records_sampled: 1390,
        },
        {
          index_date: '2026-08-21',
          frequency: 'daily',
          apix_value: 104.82,
          base_period_value: 100.0,
          raw_weighted_fare: 5534,
          delta_24h: 0.64,
          records_sampled: 1410,
        },
        {
          index_date: '2026-08-22',
          frequency: 'daily',
          apix_value: 105.83,
          base_period_value: 100.0,
          raw_weighted_fare: 5588,
          delta_24h: 0.96,
          records_sampled: 1420,
        },
      ],
      meta: {
        generated_at: '2026-08-22T05:20:00.000Z',
        count: 3,
        frequency: 'daily',
        base_period: 'JAN 2026 = 100.00',
        base_basket_fare_inr: 5280.0,
      },
    },
  },
  {
    method: 'GET',
    path: '/api/routes',
    title: 'Query Active Route Basket & Traffic Weights',
    description:
      'Returns the official 10 Indian domestic city-pairs with DGCA passenger traffic volume shares, distances, and average daily flight frequencies.',
    params: [
      {
        name: 'active_only',
        type: 'boolean',
        required: false,
        default: 'true',
        description: 'Filter strictly active basket routes.',
      },
    ],
    exampleQuery: '/api/routes',
    exampleResponse: {
      data: [
        {
          id: 'DEL-BOM',
          origin_code: 'DEL',
          origin_city: 'Delhi',
          destination_code: 'BOM',
          destination_city: 'Mumbai',
          dgca_traffic_weight: 0.185,
          dgca_traffic_share_pct: 18.5,
          distance_km: 1148,
          daily_flights_avg: 74,
          active: true,
        },
        {
          id: 'BOM-DEL',
          origin_code: 'BOM',
          origin_city: 'Mumbai',
          destination_code: 'DEL',
          destination_city: 'Delhi',
          dgca_traffic_weight: 0.178,
          dgca_traffic_share_pct: 17.8,
          distance_km: 1148,
          daily_flights_avg: 72,
          active: true,
        },
      ],
      meta: {
        generated_at: '2026-08-22T05:20:00.000Z',
        count: 16,
        total_basket_weight: 1.0,
        dgca_source_year: '2025/2026',
        total_national_volume_coverage_pct: 86.8,
      },
    },
  },
  {
    method: 'GET',
    path: '/api/fares',
    title: 'Query Cleaned Non-Outlier Fare Records',
    description:
      'Returns cleaned, deduplicated, and verified non-outlier fare quotes with base fare and tax decomposition for any route and booking window.',
    params: [
      {
        name: 'route_id',
        type: 'string',
        required: false,
        description: "Filter by route code (e.g. 'DEL-BOM', 'BLR-DEL').",
      },
      {
        name: 'booking_window',
        type: 'string',
        required: false,
        description: "Filter by booking lead time: 'T+1' | 'T+7' | 'T+15' | 'T+30' | 'T+45'.",
      },
      {
        name: 'limit',
        type: 'integer',
        required: false,
        default: '50',
        description: 'Maximum number of fare records to return (max 100).',
      },
    ],
    exampleQuery: '/api/fares?route_id=DEL-BOM&booking_window=T+1&limit=2',
    exampleResponse: {
      data: [
        {
          id: 'fare_DEL-BOM_6E_T+1_100',
          route_id: 'DEL-BOM',
          source: 'IndiGo',
          carrier: '6E',
          carrier_name: 'IndiGo',
          flight_number: '6E-200',
          booking_window: 'T+1',
          base_fare: 6942,
          taxes: 1524,
          total_fare: 8466,
          scraped_at: '2026-08-22T06:00:00.000Z',
          is_outlier: false,
        },
        {
          id: 'fare_DEL-BOM_AI_T+1_101',
          route_id: 'DEL-BOM',
          source: 'EaseMyTrip',
          carrier: 'AI',
          carrier_name: 'Air India',
          flight_number: 'AI-215',
          booking_window: 'T+1',
          base_fare: 7150,
          taxes: 1570,
          total_fare: 8720,
          scraped_at: '2026-08-22T06:00:00.000Z',
          is_outlier: false,
        },
      ],
      meta: {
        generated_at: '2026-08-22T05:20:00.000Z',
        count: 2,
        filter_route_id: 'DEL-BOM',
        filter_booking_window: 'T+1',
        clean_filter: 'NON_OUTLIERS_ONLY',
      },
    },
  },
];

export function ApiDocsView() {
  const [copiedPath, setCopiedPath] = React.useState<string | null>(null);
  const [liveOutputs, setLiveOutputs] = React.useState<Record<string, unknown>>({});
  const [loadingEndpoint, setLoadingEndpoint] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPath(id);
    setTimeout(() => setCopiedPath(null), 1500);
  };

  const handleTestLive = async (pathWithQuery: string, endpointKey: string) => {
    setLoadingEndpoint(endpointKey);
    try {
      const res = await fetch(pathWithQuery);
      const json = await res.json();
      setLiveOutputs((prev) => ({ ...prev, [endpointKey]: json }));
    } catch (err) {
      setLiveOutputs((prev) => ({
        ...prev,
        [endpointKey]: { error: (err as Error).message },
      }));
    } finally {
      setLoadingEndpoint(null);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        kicker="[MODULE 06 // PUBLIC REST API]"
        title="APIx Open Data API Specifications"
        description="High-frequency programmatic access to India's official Airfare Price Index time series, route weights, and cleaned flight quotes. Optimized for NSO, RBI econometricians, and algorithmic consumers."
      />

      {/* Overview & Security Standards Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel variant="default" className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-signal font-mono text-xs font-semibold">
            <Globe className="w-4 h-4" />
            <span>BASE URL & PROTOCOL</span>
          </div>
          <div className="font-mono text-xs text-primary font-bold bg-[#090D15] p-2 rounded border border-border-subtle break-all">
            https://api-x-chi.vercel.app/api
          </div>
          <p className="text-[11px] text-secondary mt-1">
            Live production base URL (or <span className="font-mono text-primary text-[10px]">http://localhost:3000/api</span> locally). Aspirational Ministry domain: <span className="font-mono text-secondary-muted text-[10px]">apix.gov.in/api</span>.
          </p>
        </Panel>

        <Panel variant="default" className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-delta-positive font-mono text-xs font-semibold">
            <Shield className="w-4 h-4" />
            <span>RATE LIMITING & HEADERS</span>
          </div>
          <div className="font-mono text-xs text-primary font-bold bg-[#090D15] p-2 rounded border border-border-subtle">
            60 REQUESTS / MINUTE
          </div>
          <p className="text-[11px] text-secondary mt-1">
            Standard X-RateLimit-Limit, Remaining, and Reset headers included.
          </p>
        </Panel>

        <Panel variant="default" className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-semibold">
            <Terminal className="w-4 h-4" />
            <span>STANDARDIZED ENVELOPE</span>
          </div>
          <div className="font-mono text-xs text-primary font-bold bg-[#090D15] p-2 rounded border border-border-subtle">
            {'{ data: [...], meta: { ... } }'}
          </div>
          <p className="text-[11px] text-secondary mt-1">
            Structured response envelope with timestamp and item count.
          </p>
        </Panel>
      </div>

      {/* Endpoint Cards */}
      <div className="space-y-6">
        {ENDPOINTS.map((ep) => {
          const isTesting = loadingEndpoint === ep.path;
          const liveOutput = liveOutputs[ep.path];
          const displayJson = liveOutput || ep.exampleResponse;

          return (
            <Panel key={ep.path} variant="default" className="overflow-hidden">
              <PanelHeader
                kicker={`[ENDPOINT // ${ep.method}]`}
                title={ep.title}
                statusDot="amber"
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="xs"
                      disabled={isTesting}
                      onClick={() => handleTestLive(ep.exampleQuery, ep.path)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      {isTesting ? 'FETCHING...' : 'TRY LIVE REQUEST'}
                    </Button>
                  </div>
                }
              />

              <PanelContent className="p-4 sm:p-6 space-y-6">
                {/* Method & Path banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#090D15] rounded border border-border-subtle font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-signal text-ink font-bold rounded-sm text-[11px]">
                      {ep.method}
                    </span>
                    <span className="text-primary font-bold">{ep.path}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(`curl -X GET "https://api-x-chi.vercel.app${ep.exampleQuery}"`, ep.path)}
                    className="text-secondary hover:text-amber-signal flex items-center gap-1.5 text-[11px] transition-colors"
                  >
                    {copiedPath === ep.path ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-delta-positive" />
                        <span className="text-delta-positive font-bold">COPIED CURL</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY CURL</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-secondary leading-relaxed">
                  {ep.description}
                </p>

                {/* Parameters Table */}
                {ep.params.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-mono text-xs font-semibold text-primary uppercase tracking-wider">
                      Query Parameters:
                    </h4>
                    <div className="overflow-x-auto border border-border-subtle rounded bg-surface-subtle">
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                          <tr className="border-b border-border-subtle/80 bg-surface text-secondary-muted text-[10px] uppercase">
                            <th className="p-2.5">Parameter</th>
                            <th className="p-2.5">Type</th>
                            <th className="p-2.5">Required</th>
                            <th className="p-2.5">Default</th>
                            <th className="p-2.5">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/40 text-[11px]">
                          {ep.params.map((p) => (
                            <tr key={p.name} className="hover:bg-surface-elevated/40">
                              <td className="p-2.5 text-amber-signal font-bold">{p.name}</td>
                              <td className="p-2.5 text-secondary">{p.type}</td>
                              <td className="p-2.5 text-secondary-muted">{p.required ? 'YES' : 'OPTIONAL'}</td>
                              <td className="p-2.5 text-primary font-semibold">{p.default || '—'}</td>
                              <td className="p-2.5 text-secondary font-sans text-xs">{p.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* JSON Example / Live Response Output */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-secondary-muted uppercase font-semibold">
                      {liveOutput ? 'LIVE SERVER RESPONSE (HTTP 200 OK):' : 'SAMPLE JSON RESPONSE ENVELOPE:'}
                    </span>
                    <span className="text-secondary-muted text-[10px]">CONTENT-TYPE: APPLICATION/JSON</span>
                  </div>
                  <pre className="p-4 bg-[#090D15] rounded border border-border-subtle text-primary font-mono text-xs overflow-x-auto leading-relaxed max-h-72 select-all">
                    {JSON.stringify(displayJson, null, 2)}
                  </pre>
                </div>
              </PanelContent>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
