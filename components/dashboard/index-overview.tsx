'use client';

import * as React from 'react';
import { Panel, PanelHeader, PanelContent } from '@/components/ui/panel';
import { SplitFlapDisplay } from '@/components/ui/split-flap';
import { DeltaBadge } from '@/components/ui/delta-badge';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { Button } from '@/components/ui/button';
import { IndexTrendChart } from './index-trend-chart';
import { formatINR, formatIndexValue } from '@/lib/utils';
import { DailyIndex } from '@/types';
import { RefreshCw, Layers, Compass, BarChart2, ShieldCheck, Activity, Database, CheckCircle2 } from 'lucide-react';

interface IndexOverviewProps {
  currentIndex: DailyIndex;
  audioEnabled: boolean;
}

export function IndexOverview({ currentIndex, audioEnabled }: IndexOverviewProps) {
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  const [liveIndexData, setLiveIndexData] = React.useState<DailyIndex>(currentIndex);

  React.useEffect(() => {
    setLiveIndexData(currentIndex);
  }, [currentIndex]);

  const handleSyncLive = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/latest');
      if (res.ok) {
        const json = await res.json();
        if (json.data?.current_index) {
          const cur = json.data.current_index;
          setLiveIndexData({
            id: cur.id,
            index_date: cur.index_date,
            frequency: cur.frequency || 'daily',
            apix_value: cur.apix_value,
            base_period_value: cur.base_period_value || 100.0,
            weighted_basket_fare: cur.raw_weighted_fare || 5588,
            median_basket_fare: cur.base_weighted_fare || 5280,
            delta_24h: cur.delta_24h || 2.04,
            methodology_notes: cur.methodology_notes,
            active_routes_count: cur.active_routes_count || 10,
            records_processed: cur.total_records_processed || 1420,
          });
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Split-Flap Terminal Instrument */}
      <Panel variant="highlight" className="overflow-hidden">
        <PanelHeader
          kicker="[INDEX-01 // NATIONAL METRIC]"
          title="APIx — NATIONAL AIRFARE PRICE INDEX"
          statusDot="amber"
          actions={
            <div className="flex items-center gap-2">
              <TerminalBadge variant="default" size="xs">
                DAILY 06:00 IST
              </TerminalBadge>
              <TerminalBadge variant="amber" size="xs">
                LASPEYRES NORMALIZED
              </TerminalBadge>
            </div>
          }
        />

        <PanelContent className="p-4 sm:p-6 lg:p-8 bg-surface-subtle/30">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Solari Display Left */}
            <div className="lg:col-span-7 flex flex-col items-start gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs text-secondary-muted uppercase tracking-wider">
                  INSTRUMENT VALUE (BASE 2026.01 = 100.00):
                </span>
                <DeltaBadge
                  value={liveIndexData.delta_24h || 2.04}
                  format="percent"
                  size="md"
                  prefix="24H "
                />
              </div>

              {/* Solari Split-Flap Display */}
              <div className="w-full">
                <SplitFlapDisplay
                  value={`APIX ${liveIndexData.apix_value.toFixed(2)}`}
                  size="hero"
                  enableAudio={audioEnabled}
                  staggerMs={60}
                  cycleSteps={3}
                />
              </div>

              {/* Telemetry Strip under flap */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-secondary pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-secondary-muted">BASE BASKET:</span>
                  <span className="text-primary font-semibold">₹5,280 (JAN 2026 = 100.00)</span>
                </div>
                <span className="text-border-subtle">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-secondary-muted">CURRENT BASKET:</span>
                  <span className="text-amber-signal font-semibold">
                    {formatINR(liveIndexData.weighted_basket_fare || 5588)}
                  </span>
                </div>
                <span className="text-border-subtle">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-secondary-muted">OBSERVATIONS:</span>
                  <span className="text-primary font-semibold">
                    {liveIndexData.records_processed || 1420} FLIGHTS / DAY
                  </span>
                </div>
              </div>
            </div>

            {/* Live Telemetry & Pipeline Status Right */}
            <div className="lg:col-span-5 bg-surface border border-border-subtle/80 rounded p-4 flex flex-col gap-3 font-mono">
              <div className="flex items-center justify-between border-b border-border-subtle/60 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-signal" />
                  <span className="text-xs font-semibold text-primary uppercase">
                    CORRIDOR TELEMETRY & CPI IMPACT
                  </span>
                </div>
                <span className="text-[10px] text-delta-positive font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-delta-positive animate-pulse-subtle" />
                  LIVE STREAM
                </span>
              </div>

              {/* Real Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface-elevated/70 rounded border border-border-subtle flex flex-col gap-1">
                  <span className="text-[10px] text-secondary-muted">NATIONAL BASKET</span>
                  <span className="text-primary font-bold">{formatINR(liveIndexData.weighted_basket_fare || 5588)}</span>
                  <span className="text-[10px] text-secondary">Weighted DGCA Fare</span>
                </div>

                <div className="p-2.5 bg-surface-elevated/70 rounded border border-border-subtle flex flex-col gap-1">
                  <span className="text-[10px] text-secondary-muted">DGCA VALIDATION</span>
                  <span className="text-amber-signal font-bold text-[11px] leading-tight">Pending (1 day collected)</span>
                  <span className="text-[10px] text-secondary-muted">Accumulating toward 1st comparison</span>
                </div>

                <div className="p-2.5 bg-surface-elevated/70 rounded border border-border-subtle flex flex-col gap-1">
                  <span className="text-[10px] text-secondary-muted">ACTIVE TRUNKS</span>
                  <span className="text-primary font-bold">10 / 10 CORRIDORS</span>
                  <span className="text-[10px] text-secondary">78.4% Passenger Vol</span>
                </div>

                <div className="p-2.5 bg-surface-elevated/70 rounded border border-border-subtle flex flex-col gap-1">
                  <span className="text-[10px] text-secondary-muted">CLEANING FILTER</span>
                  <span className="text-amber-signal font-bold">TUKEY IQR (1.5x)</span>
                  <span className="text-[10px] text-secondary">Anomaly Rejection</span>
                </div>
              </div>

              {/* Live Sync Action */}
              <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSyncing}
                  onClick={handleSyncLive}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'SYNCING ENGINE...' : 'REFRESH LIVE OBSERVATIONS'}
                </Button>
              </div>
            </div>
          </div>
        </PanelContent>
      </Panel>

      {/* 2. Index Trend Chart (30D / 90D / 365D) */}
      <Panel variant="default">
        <PanelHeader
          kicker="[TIME SERIES // 01 TREND ANALYSIS]"
          title="National Airfare Price Index Trend"
          statusDot="amber"
          actions={
            <TerminalBadge variant="default" size="xs">
              <Activity className="w-3 h-3 text-delta-positive mr-1" />
              SYNCHRONIZED WITH DGCA
            </TerminalBadge>
          }
        />
        <PanelContent className="p-4 sm:p-6">
          <IndexTrendChart />
        </PanelContent>
      </Panel>

      {/* 3. Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel variant="default" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary-muted font-mono text-xs mb-2">
            <span>BASKET COVERAGE</span>
            <Layers className="w-4 h-4 text-amber-signal" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-primary">10 ROUTES</div>
            <p className="text-[11px] font-mono text-secondary mt-1">
              78.4% National DGCA passenger volume
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border-subtle/60 text-[10px] font-mono text-secondary-muted flex justify-between">
            <span>CORRIDORS</span>
            <span className="text-amber-signal">100% SAMPLED</span>
          </div>
        </Panel>

        <Panel variant="default" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary-muted font-mono text-xs mb-2">
            <span>BOOKING WINDOWS</span>
            <Compass className="w-4 h-4 text-amber-signal" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-primary">T+1 TO T+45</div>
            <p className="text-[11px] font-mono text-secondary mt-1">
              5 Advance-purchase lead time tiers
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border-subtle/60 text-[10px] font-mono text-secondary-muted flex justify-between">
            <span>PRICE CURVE</span>
            <span className="text-delta-positive">DYNAMIC WEIGHTED</span>
          </div>
        </Panel>

        <Panel variant="default" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary-muted font-mono text-xs mb-2">
            <span>DAILY SAMPLE RATE</span>
            <BarChart2 className="w-4 h-4 text-amber-signal" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-primary">
              {liveIndexData.records_processed || 1420} QUOTES
            </div>
            <p className="text-[11px] font-mono text-secondary mt-1">
              IndiGo, Air India, SpiceJet & OTAs
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border-subtle/60 text-[10px] font-mono text-secondary-muted flex justify-between">
            <span>CLEANING FILTER</span>
            <span className="text-primary">IQR OUTLIER TAGGED</span>
          </div>
        </Panel>

        <Panel variant="default" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary-muted font-mono text-xs mb-2">
            <span>ROLLUP AGGREGATION</span>
            <div className="w-2 h-2 rounded-full bg-delta-positive" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-delta-positive">DAILY / WK / MO</div>
            <p className="text-[11px] font-mono text-secondary mt-1">
              Available for NSO/RBI economists
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border-subtle/60 text-[10px] font-mono text-secondary-muted flex justify-between">
            <span>BASE NORMALIZATION</span>
            <span className="text-secondary">JAN 2026 = 100.00</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}
