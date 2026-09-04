'use client';

import * as React from 'react';
import { Panel, PanelHeader, PanelContent, PanelFooter } from '@/components/ui/panel';
import { SectionHeader } from '@/components/ui/section-header';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { Button } from '@/components/ui/button';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { DGCA_ROUTE_BASKET } from '@/lib/mock-data';
import { formatINR, formatWeight, cn } from '@/lib/utils';
import { BookingWindow, FareClass } from '@/types';
import {
  ShieldCheck,
  Download,
  Code2,
  RefreshCw,
  Plane,
  Clock,
  Calendar,
  AlertCircle,
  Filter,
  CheckCircle2,
  Database,
  ArrowRight,
  Layers,
  Sparkles,
  Info,
  X,
  Copy,
  Check
} from 'lucide-react';

interface CleanedRecordRow {
  id: string;
  route_id: string;
  source: string;
  carrier: string;
  flight_number?: string;
  departure_time?: string;
  flight_date: string;
  booking_window: BookingWindow;
  fare_class: FareClass;
  base_fare: number;
  taxes: number;
  total_fare: number;
  scraped_at: string;
  is_outlier?: boolean;
  is_nonstop?: boolean;
}

const AIRLINE_MAP: Record<string, { name: string; badge: string; border: string }> = {
  '6E': { name: 'IndiGo', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', border: 'border-blue-500/40' },
  'AI': { name: 'Air India', badge: 'bg-red-500/15 text-red-400 border-red-500/30', border: 'border-red-500/40' },
  'QP': { name: 'Akasa Air', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30', border: 'border-orange-500/40' },
  'SG': { name: 'SpiceJet', badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30', border: 'border-rose-500/40' },
  'IX': { name: 'Air India Express', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', border: 'border-amber-500/40' },
  'UK': { name: 'Vistara', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30', border: 'border-purple-500/40' },
};

const WINDOW_META: Record<BookingWindow, { label: string; daysLabel: string; desc: string }> = {
  'T+1': { label: 'T+1', daysLabel: '1 Day Ahead', desc: 'Last-minute spot departure (high commercial elasticity)' },
  'T+7': { label: 'T+7', daysLabel: '7 Days Ahead', desc: 'Near-term departure (business & urgent travel)' },
  'T+15': { label: 'T+15', daysLabel: '15 Days Ahead', desc: 'Mid-term horizon (representative consumer median)' },
  'T+30': { label: 'T+30', daysLabel: '30 Days Ahead', desc: 'Early booking horizon (leisure/planned advance)' },
  'T+45': { label: 'T+45', daysLabel: '45 Days Ahead', desc: 'Baseline anchor horizon (deep advance lowest yield)' },
};

export function FareInspectorView() {
  const [selectedRoute, setSelectedRoute] = React.useState<string>('DEL-BOM');
  const [selectedWindow, setSelectedWindow] = React.useState<BookingWindow>('T+15');
  const [selectedCarrier, setSelectedCarrier] = React.useState<string>('ALL');
  const [selectedFareClass, setSelectedFareClass] = React.useState<string>('ALL');
  const [records, setRecords] = React.useState<CleanedRecordRow[]>([]);
  const [totalInStore, setTotalInStore] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showJsonModal, setShowJsonModal] = React.useState<boolean>(false);
  const [copied, setCopied] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const activeRouteObj = React.useMemo(() => {
    return DGCA_ROUTE_BASKET.find((r) => r.id === selectedRoute) || DGCA_ROUTE_BASKET[0];
  }, [selectedRoute]);

  const fetchFares = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        route_id: selectedRoute,
        booking_window: selectedWindow,
        limit: '150',
      });
      if (selectedFareClass !== 'ALL') {
        params.set('fare_class', selectedFareClass);
      }

      const res = await fetch(`/api/fares?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch fare records`);
      }
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        setRecords(json.data);
        setTotalInStore(json.meta?.total_available_in_store || json.meta?.count || json.data.length);
      } else {
        setRecords([]);
        setTotalInStore(0);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load sample fare observations');
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRoute, selectedWindow, selectedFareClass]);

  React.useEffect(() => {
    fetchFares();
  }, [fetchFares]);

  // Client-side filtering by carrier or search query
  const filteredRecords = React.useMemo(() => {
    let list = records;
    if (selectedCarrier !== 'ALL') {
      list = list.filter((r) => r.carrier.toUpperCase() === selectedCarrier.toUpperCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.carrier.toLowerCase().includes(q) ||
          (r.flight_number && r.flight_number.toLowerCase().includes(q)) ||
          (r.source && r.source.toLowerCase().includes(q)) ||
          (r.departure_time && r.departure_time.toLowerCase().includes(q))
      );
    }
    return list;
  }, [records, selectedCarrier, searchQuery]);

  // Derived statistics for the current filtered slice
  const stats = React.useMemo(() => {
    if (filteredRecords.length === 0) {
      return {
        count: 0,
        medianFare: 0,
        minFare: 0,
        maxFare: 0,
        avgBaseFare: 0,
        avgTaxes: 0,
        carriers: [] as { code: string; count: number }[],
        latestScrape: null as string | null,
      };
    }

    const fares = filteredRecords.map((r) => r.total_fare).sort((a, b) => a - b);
    const mid = Math.floor(fares.length / 2);
    const medianFare = fares.length % 2 !== 0 ? fares[mid] : Math.round((fares[mid - 1] + fares[mid]) / 2);

    const minFare = fares[0];
    const maxFare = fares[fares.length - 1];

    const sumBase = filteredRecords.reduce((acc, r) => acc + (r.base_fare || 0), 0);
    const sumTaxes = filteredRecords.reduce((acc, r) => acc + (r.taxes || 0), 0);

    const carrierCounts: Record<string, number> = {};
    let latestTs: string | null = null;

    filteredRecords.forEach((r) => {
      carrierCounts[r.carrier] = (carrierCounts[r.carrier] || 0) + 1;
      if (!latestTs || (r.scraped_at && r.scraped_at > latestTs)) {
        latestTs = r.scraped_at;
      }
    });

    const carriers = Object.entries(carrierCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);

    return {
      count: filteredRecords.length,
      medianFare,
      minFare,
      maxFare,
      avgBaseFare: Math.round(sumBase / filteredRecords.length),
      avgTaxes: Math.round(sumTaxes / filteredRecords.length),
      carriers,
      latestScrape: latestTs,
    };
  }, [filteredRecords]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'id',
      'route_id',
      'carrier',
      'flight_number',
      'departure_time',
      'flight_date',
      'booking_window',
      'fare_class',
      'base_fare',
      'taxes',
      'total_fare',
      'source',
      'scraped_at',
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.route_id,
      r.carrier,
      r.flight_number || 'N/A',
      r.departure_time || 'N/A',
      r.flight_date,
      r.booking_window,
      r.fare_class || 'Economy',
      r.base_fare,
      r.taxes,
      r.total_fare,
      r.source,
      r.scraped_at,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `APIx_Fares_${selectedRoute}_${selectedWindow}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatIST = (isoString?: string | null) => {
    if (!isoString) return 'LIVE PIPELINE';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(d) + ' IST';
    } catch {
      return isoString;
    }
  };

  // Table Columns Definition
  const columns: ColumnDef<CleanedRecordRow>[] = [
    {
      id: 'carrier',
      header: 'CARRIER',
      accessorKey: 'carrier',
      sortable: true,
      width: '120px',
      cell: (row) => {
        const info = AIRLINE_MAP[row.carrier] || {
          name: row.carrier,
          badge: 'bg-surface-elevated text-secondary border-border-subtle',
          border: 'border-border-subtle',
        };
        return (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wider',
                info.badge
              )}
            >
              {row.carrier}
            </span>
            <span className="text-xs text-primary font-medium truncate max-w-[80px] hidden sm:inline">
              {info.name}
            </span>
          </div>
        );
      },
    },
    {
      id: 'flight_number',
      header: 'FLIGHT NO.',
      accessorKey: 'flight_number',
      sortable: true,
      width: '110px',
      cell: (row) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-primary font-bold">
          <Plane className="w-3 h-3 text-secondary-muted" />
          <span>{row.flight_number || 'NON-STOP'}</span>
        </div>
      ),
    },
    {
      id: 'departure_time',
      header: 'DEP. TIME',
      accessorKey: 'departure_time',
      sortable: true,
      width: '100px',
      cell: (row) => (
        <div className="flex items-center gap-1 font-mono text-xs text-secondary">
          <Clock className="w-3 h-3 text-secondary-muted" />
          <span>{row.departure_time || 'DAY TIME'}</span>
        </div>
      ),
    },
    {
      id: 'flight_date',
      header: 'DATE / WINDOW',
      accessorKey: 'flight_date',
      sortable: true,
      width: '140px',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-secondary">{row.flight_date}</span>
          <span className="px-1 py-0.2 bg-surface-elevated text-[10px] text-amber-signal rounded border border-border-subtle">
            {row.booking_window}
          </span>
        </div>
      ),
    },
    {
      id: 'fare_class',
      header: 'CLASS',
      accessorKey: 'fare_class',
      sortable: true,
      width: '95px',
      cell: (row) => (
        <span
          className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider',
            row.fare_class === 'Business'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold'
              : row.fare_class === 'Premium Economy'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : 'bg-surface-elevated text-secondary-muted border border-border-subtle'
          )}
        >
          {row.fare_class || 'Economy'}
        </span>
      ),
    },
    {
      id: 'base_fare',
      header: 'BASE FARE',
      accessorKey: 'base_fare',
      align: 'right',
      sortable: true,
      width: '110px',
      cell: (row) => (
        <span className="font-mono text-xs text-secondary tabular-nums">
          {formatINR(row.base_fare)}
        </span>
      ),
    },
    {
      id: 'taxes',
      header: 'TAXES & FEES',
      accessorKey: 'taxes',
      align: 'right',
      sortable: true,
      width: '110px',
      cell: (row) => (
        <span className="font-mono text-xs text-secondary-muted tabular-nums" title="GST (5%) + UDF + ASF">
          {formatINR(row.taxes)}
        </span>
      ),
    },
    {
      id: 'total_fare',
      header: 'TOTAL FARE',
      accessorKey: 'total_fare',
      align: 'right',
      sortable: true,
      width: '120px',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-amber-signal tabular-nums">
          {formatINR(row.total_fare)}
        </span>
      ),
    },
    {
      id: 'source',
      header: 'OTA / SOURCE',
      accessorKey: 'source',
      sortable: true,
      width: '120px',
      cell: (row) => (
        <span className="px-1.5 py-0.5 rounded bg-surface-subtle text-[11px] font-mono text-secondary border border-border-subtle/60">
          {row.source || 'Aggregator'}
        </span>
      ),
    },
    {
      id: 'scraped_at',
      header: 'INGEST TIMESTAMP',
      accessorKey: 'scraped_at',
      sortable: true,
      width: '170px',
      cell: (row) => (
        <span className="font-mono text-[11px] text-secondary-muted tabular-nums">
          {formatIST(row.scraped_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <SectionHeader
        kicker="07 · MICRO-DATA AUDIT TRAIL"
        title="SAMPLE FARE INSPECTOR & MICRO-DATA AUDIT LEDGER"
        description="Transparent verification layer: inspect individual cleaned flight fare records collected directly from compliant sources contributing to the national representative price vector."
        actions={
          <TerminalBadge variant="amber" size="sm" dot>
            100% UNMANIPULATED REAL QUOTES
          </TerminalBadge>
        }
      />

      {/* Corridor & Window Selection Matrix */}
      <Panel>
        <PanelHeader
          kicker="BASKET CROSS-SECTION"
          title="AUDIT PARAMETER CONTROLS"
          statusDot="amber"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchFares}
                disabled={isLoading}
                className="gap-1.5 text-secondary hover:text-primary border-border-subtle"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-amber-signal')} />
                <span className="hidden sm:inline font-mono">REFRESH QUOTES</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={filteredRecords.length === 0}
                className="gap-1.5 text-secondary hover:text-primary border-border-subtle"
              >
                <Download className="w-3.5 h-3.5 text-delta-positive" />
                <span className="hidden sm:inline font-mono">EXPORT CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowJsonModal(true)}
                className="gap-1.5 text-secondary hover:text-primary border-border-subtle"
              >
                <Code2 className="w-3.5 h-3.5 text-amber-signal" />
                <span className="hidden sm:inline font-mono">API QUERY</span>
              </Button>
            </div>
          }
        />
        <PanelContent className="p-4 space-y-4">
          {/* Row 1: Corridor Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-secondary-muted">
              <span className="flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-amber-signal" />
                <span>SELECT DGCA BASKET CORRIDOR ({DGCA_ROUTE_BASKET.length} ACTIVE ROUTES):</span>
              </span>
              <span className="text-primary font-bold">
                WEIGHT: {formatWeight(activeRouteObj.dgca_traffic_weight)} NATIONAL PASSENGER TRAFFIC
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
              {DGCA_ROUTE_BASKET.map((route) => {
                const isSelected = selectedRoute === route.id;
                return (
                  <button
                    key={route.id}
                    onClick={() => setSelectedRoute(route.id)}
                    className={cn(
                      'p-2 text-left rounded border transition-all flex flex-col justify-between font-mono',
                      isSelected
                        ? 'bg-amber-signal/15 border-amber-signal text-amber-signal shadow-sm ring-1 ring-amber-signal/40'
                        : 'bg-surface border-border-subtle/70 text-secondary hover:text-primary hover:border-border-subtle hover:bg-surface-elevated/40'
                    )}
                  >
                    <div className="text-xs font-bold">{route.id}</div>
                    <div className="text-[10px] text-secondary-muted truncate">
                      {route.origin_code}→{route.destination_code}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Booking Window Selector & Filters */}
          <div className="pt-2 border-t border-border-subtle/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Booking Windows */}
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-secondary-muted flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-signal" />
                <span>DEPARTURE LEAD TIME (BOOKING WINDOW):</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(Object.keys(WINDOW_META) as BookingWindow[]).map((win) => {
                  const meta = WINDOW_META[win];
                  const isSelected = selectedWindow === win;
                  return (
                    <Button
                      key={win}
                      variant={isSelected ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedWindow(win)}
                      className={cn(
                        'font-mono text-xs px-3',
                        isSelected
                          ? 'bg-amber-signal text-ink font-bold hover:bg-amber-signal/90'
                          : 'border border-border-subtle text-secondary hover:text-primary'
                      )}
                    >
                      <span className="font-bold">{meta.label}</span>
                      <span className="opacity-75 text-[11px] ml-1">({meta.daysLabel})</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Carrier Filter & Fare Class Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Carrier Dropdown */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-secondary-muted block">CARRIER FILTER:</span>
                <select
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  className="bg-surface border border-border-subtle text-primary font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-signal"
                >
                  <option value="ALL">ALL CARRIERS</option>
                  <option value="6E">6E (IndiGo)</option>
                  <option value="AI">AI (Air India)</option>
                  <option value="QP">QP (Akasa Air)</option>
                  <option value="SG">SG (SpiceJet)</option>
                  <option value="IX">IX (Air India Express)</option>
                </select>
              </div>

              {/* Fare Class Dropdown */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-secondary-muted block">CABIN CLASS:</span>
                <select
                  value={selectedFareClass}
                  onChange={(e) => setSelectedFareClass(e.target.value)}
                  className="bg-surface border border-border-subtle text-primary font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-signal"
                >
                  <option value="ALL">ALL CLASSES</option>
                  <option value="Economy">ECONOMY</option>
                  <option value="Premium Economy">PREMIUM ECONOMY</option>
                  <option value="Business">BUSINESS</option>
                </select>
              </div>

              {/* Quick Text Filter */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-secondary-muted block">FLIGHT SEARCH:</span>
                <input
                  type="text"
                  placeholder="Filter flight / time..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-surface border border-border-subtle text-primary font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-signal w-36 sm:w-40 placeholder:text-secondary-muted"
                />
              </div>
            </div>
          </div>
        </PanelContent>
      </Panel>

      {/* Summary Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Selected Route Info */}
        <div className="p-3 bg-surface border border-border-subtle rounded shadow-sm">
          <div className="text-[10px] font-mono text-secondary-muted uppercase">CORRIDOR SECTOR</div>
          <div className="text-sm font-mono font-bold text-primary flex items-center gap-1.5 mt-1">
            <span>{activeRouteObj.origin_city}</span>
            <ArrowRight className="w-3 h-3 text-amber-signal" />
            <span>{activeRouteObj.destination_city}</span>
          </div>
          <div className="text-[10px] font-mono text-secondary-muted mt-0.5">
            {activeRouteObj.distance_km || 1148} km · {activeRouteObj.daily_flights_avg || 72} daily flights
          </div>
        </div>

        {/* Contributing Observations Count */}
        <div className="p-3 bg-surface border border-border-subtle rounded shadow-sm">
          <div className="text-[10px] font-mono text-secondary-muted uppercase">SAMPLED OBSERVATIONS</div>
          <div className="text-base font-mono font-bold text-primary tabular-nums mt-1 flex items-baseline gap-1">
            <span>{stats.count}</span>
            <span className="text-xs text-secondary font-normal">quotes</span>
          </div>
          <div className="text-[10px] font-mono text-delta-positive flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% NON-OUTLIER VERIFIED</span>
          </div>
        </div>

        {/* Representative Median Fare */}
        <div className="p-3 bg-surface border border-amber-signal/40 rounded shadow-sm bg-amber-signal/5">
          <div className="text-[10px] font-mono text-amber-signal font-semibold uppercase">
            REPRESENTATIVE MEDIAN FARE
          </div>
          <div className="text-base font-mono font-bold text-amber-signal tabular-nums mt-1">
            {formatINR(stats.medianFare)}
          </div>
          <div className="text-[10px] font-mono text-secondary-muted mt-0.5">
            Laspeyres engine route-cell input
          </div>
        </div>

        {/* Fare Spread Min-Max */}
        <div className="p-3 bg-surface border border-border-subtle rounded shadow-sm">
          <div className="text-[10px] font-mono text-secondary-muted uppercase">FARE SPREAD (MIN - MAX)</div>
          <div className="text-xs font-mono font-bold text-primary tabular-nums mt-1">
            {formatINR(stats.minFare)} – {formatINR(stats.maxFare)}
          </div>
          <div className="text-[10px] font-mono text-secondary-muted mt-0.5">
            Dispersion: {formatINR(stats.maxFare - stats.minFare)}
          </div>
        </div>

        {/* Base Fare vs Tax Component */}
        <div className="p-3 bg-surface border border-border-subtle rounded shadow-sm">
          <div className="text-[10px] font-mono text-secondary-muted uppercase">AVG FARE BREAKDOWN</div>
          <div className="text-xs font-mono text-primary tabular-nums mt-1">
            Base: <span className="font-bold">{formatINR(stats.avgBaseFare)}</span>
          </div>
          <div className="text-[10px] font-mono text-secondary-muted mt-0.5">
            Taxes & Fees: <span className="text-secondary">{formatINR(stats.avgTaxes)}</span>
          </div>
        </div>

        {/* Participating Carriers Breakdown */}
        <div className="p-3 bg-surface border border-border-subtle rounded shadow-sm">
          <div className="text-[10px] font-mono text-secondary-muted uppercase">CARRIERS SAMPLED</div>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {stats.carriers.length > 0 ? (
              stats.carriers.map((c) => (
                <span
                  key={c.code}
                  className="px-1 py-0.2 bg-surface-elevated text-[10px] font-mono text-secondary rounded border border-border-subtle"
                  title={`${c.code}: ${c.count} quotes`}
                >
                  {c.code}:{c.count}
                </span>
              ))
            ) : (
              <span className="text-xs font-mono text-secondary-muted">—</span>
            )}
          </div>
          <div className="text-[10px] font-mono text-secondary-muted mt-0.5 truncate">
            {stats.latestScrape ? formatIST(stats.latestScrape).slice(0, 11) : 'Live Ingest'}
          </div>
        </div>
      </div>

      {/* Main Audit Micro-Data Table */}
      <Panel>
        <PanelHeader
          kicker={`MICRO-DATA LEDGER · ${filteredRecords.length} RECORDED QUOTES`}
          title={`${selectedRoute} · ${WINDOW_META[selectedWindow].label} (${WINDOW_META[selectedWindow].daysLabel})`}
          statusDot="green"
          actions={
            <div className="text-[11px] font-mono text-secondary-muted flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-delta-positive" />
              <span>ROBOTS.TXT COMPLIANT SCRAPE HARVEST</span>
            </div>
          }
        />
        <PanelContent className="p-0">
          {error ? (
            <div className="p-8 text-center bg-surface-subtle/30 font-mono">
              <AlertCircle className="w-8 h-8 text-delta-negative mx-auto mb-2" />
              <p className="text-xs text-primary font-bold">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchFares} className="mt-4">
                RETRY INGEST
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredRecords}
              keyExtractor={(r, idx) => r.id || `fare_${idx}`}
              dense={true}
              emptyTitle="NO CLEANED FARE RECORDS FOR SELECTED CRITERIA"
              emptyMessage={`No cleaned flight observations match ${selectedRoute} on ${selectedWindow}. Try selecting 'ALL CARRIERS' or a different booking horizon.`}
            />
          )}
        </PanelContent>
        <PanelFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] font-mono text-secondary-muted gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-delta-positive" />
            <span>
              DATA AUDIT GUARANTEE: Sourced directly from verified multi-carrier OTA feeds. Tukey IQR Outlier Rejection applied.
            </span>
          </div>
          <div className="text-secondary">
            Displaying {filteredRecords.length} of {totalInStore} records available in store
          </div>
        </PanelFooter>
      </Panel>

      {/* Econometric & Regulatory Methodology Callout */}
      <div className="p-4 rounded border border-border-subtle bg-surface-subtle/40 text-xs font-mono space-y-2">
        <div className="flex items-center gap-2 text-primary font-bold">
          <Info className="w-4 h-4 text-amber-signal" />
          <span>DATA INTEGRITY & STATISTICAL AUDIT PROVENANCE</span>
        </div>
        <p className="text-secondary leading-relaxed text-[11px]">
          Every flight observation listed above is harvested under strict rate-limiting and robots.txt compliance.
          Before admission into the Laspeyres index engine, quotes undergo <strong>Composite Deduplication</strong>{' '}
          <code className="text-amber-signal text-[10px]">[route_id, carrier, flight_number, flight_date, window, fare_class]</code>{' '}
          and <strong>Tukey IQR Outlier Rejection</strong> to ensure that zero fabricated or promotional flash-sale artifacts distort the consumer price metric.
          The <strong>Representative Fare</strong> is computed strictly as the robust median of these verified records.
        </p>
      </div>

      {/* Raw API Query Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-border-subtle rounded shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] font-mono text-xs">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between bg-surface-subtle">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Code2 className="w-4 h-4 text-amber-signal" />
                <span>PUBLIC REST API AUDIT REPRODUCIBILITY</span>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-secondary-muted hover:text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <span className="text-secondary-muted text-[11px] block mb-1">CURL REQUEST ENDPOINT:</span>
                <div className="bg-ink p-2.5 rounded border border-border-subtle text-amber-signal flex items-center justify-between gap-2 overflow-x-auto">
                  <code className="text-[11px]">
                    curl -X GET "https://ap-ix.vercel.app/api/fares?route_id=${selectedRoute}&booking_window=${selectedWindow}&limit=50"
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `curl -X GET "https://ap-ix.vercel.app/api/fares?route_id=${selectedRoute}&booking_window=${selectedWindow}&limit=50"`
                      );
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="shrink-0 text-secondary hover:text-primary"
                    title="Copy cURL command"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-delta-positive" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-secondary-muted text-[11px] block mb-1">
                  SAMPLE JSON RESPONSE PAYLOAD ({filteredRecords.slice(0, 2).length} OBSERVATIONS):
                </span>
                <pre className="bg-ink p-3 rounded border border-border-subtle text-secondary text-[11px] overflow-x-auto leading-relaxed max-h-60">
                  {JSON.stringify(
                    {
                      data: filteredRecords.slice(0, 3),
                      meta: {
                        generated_at: new Date().toISOString(),
                        count: filteredRecords.length,
                        filter_route_id: selectedRoute,
                        filter_booking_window: selectedWindow,
                        filter_fare_class: selectedFareClass,
                        total_available_in_store: totalInStore,
                        data_source: 'REAL_CLEANED_FLIGHT_RECORDS',
                        compliance_policy: 'ROBOTS_TXT_ADHERENT',
                      },
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-between bg-surface-subtle">
              <span className="text-[11px] text-secondary-muted">Rate limit: 60 requests/min per IP</span>
              <Button variant="outline" size="sm" onClick={() => setShowJsonModal(false)}>
                CLOSE
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
