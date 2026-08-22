'use client';

import * as React from 'react';
import { Panel, PanelHeader, PanelFooter, PanelContent } from '@/components/ui/panel';
import { SectionHeader } from '@/components/ui/section-header';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { DeltaBadge } from '@/components/ui/delta-badge';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { Button } from '@/components/ui/button';
import { RouteHeatmapItem, ROUTE_HEATMAP_DATA } from '@/lib/data-provider';
import { formatINR, formatWeight } from '@/lib/utils';
import { ArrowRight, Plane, Filter, Download, ArrowUpDown } from 'lucide-react';

export function RouteHeatmap() {
  const [data, setData] = React.useState<RouteHeatmapItem[]>(ROUTE_HEATMAP_DATA);
  const [filterStatus, setFilterStatus] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<'table' | 'tiles'>('table');

  const filteredData = React.useMemo(() => {
    if (filterStatus === 'all') return data;
    return data.filter((item) => item.status === filterStatus);
  }, [data, filterStatus]);

  const columns: ColumnDef<RouteHeatmapItem>[] = [
    {
      id: 'route_code',
      header: 'CORRIDOR',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5 py-1">
          <div className="flex items-center gap-1 font-mono font-bold text-xs text-primary bg-surface-elevated px-2 py-1 rounded border border-border-subtle shrink-0">
            <span>{row.origin_code}</span>
            <ArrowRight className="w-3 h-3 text-amber-signal" />
            <span>{row.destination_code}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-sans text-primary font-medium truncate">
              {row.origin_city} → {row.destination_city}
            </span>
            <span className="text-[10px] font-mono text-secondary-muted">
              DGCA Share: {formatWeight(row.dgca_traffic_weight)}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'weight_bar',
      header: 'TRAFFIC SHARE',
      sortable: true,
      accessorKey: 'dgca_traffic_weight',
      cell: (row) => (
        <div className="flex flex-col gap-1 w-24">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-primary font-semibold">{formatWeight(row.dgca_traffic_weight)}</span>
            <span className="text-secondary-muted">vol</span>
          </div>
          <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden border border-border-subtle/50">
            <div
              className="bg-amber-signal h-full rounded-full"
              style={{ width: `${row.dgca_traffic_weight * 400}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'baseline_fare',
      header: 'BASE FARE (JAN 26)',
      sortable: true,
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-xs text-secondary-muted">
          {formatINR(row.baseline_fare)}
        </span>
      ),
    },
    {
      id: 'current_fare',
      header: 'CURRENT FARE',
      sortable: true,
      align: 'right',
      cell: (row) => (
        <span className="font-mono font-bold text-xs text-primary">
          {formatINR(row.current_fare)}
        </span>
      ),
    },
    {
      id: 'delta_percent',
      header: 'DELTA VS BASELINE',
      sortable: true,
      align: 'center',
      cell: (row) => {
        const isSurge = row.delta_percent > 0;
        const colorClass = isSurge
          ? 'bg-delta-negative/15 text-delta-negative border-delta-negative/30'
          : 'bg-delta-positive/15 text-delta-positive border-delta-positive/30';

        return (
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-xs font-semibold select-none ${colorClass}`}
          >
            <span>{isSurge ? '▲' : '▼'}</span>
            <span>{isSurge ? '+' : ''}{row.delta_percent.toFixed(2)}%</span>
            <span className="text-[10px] opacity-75">
              ({isSurge ? '+' : ''}₹{row.delta_amount})
            </span>
          </div>
        );
      },
    },
    {
      id: 't1_fare',
      header: 'T+1 (LAST-MIN)',
      sortable: true,
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-xs text-delta-negative/90">
          {formatINR(row.t1_fare)}
        </span>
      ),
    },
    {
      id: 't45_fare',
      header: 'T+45 (ADVANCE)',
      sortable: true,
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-xs text-delta-positive/90">
          {formatINR(row.t45_fare)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'STATUS',
      align: 'center',
      cell: (row) => {
        const variantMap = {
          SURGE: 'red',
          NORMAL: 'default',
          EASED: 'green',
          STABLE: 'subtle',
        } as const;

        return (
          <TerminalBadge variant={variantMap[row.status] || 'default'} size="xs" dot>
            {row.status}
          </TerminalBadge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="[MODULE 02 // DEPARTURE HEATMAP]"
        title="Route Fare Heatmap vs. Base Period Normalization"
        description="Airport departure board matrix comparing current high-frequency representative fares against the Jan 2026 baseline. Color-coded strictly by economic delta direction (Green = Price Drop, Red = Price Surge)."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'table' ? 'primary' : 'outline'}
              size="xs"
              onClick={() => setViewMode('table')}
            >
              BOARD VIEW
            </Button>
            <Button
              variant={viewMode === 'tiles' ? 'primary' : 'outline'}
              size="xs"
              onClick={() => setViewMode('tiles')}
            >
              HEAT TILES
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="p-3.5 bg-surface border border-border-subtle rounded flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-secondary-muted" />
          <span className="text-secondary-muted">FILTER TARIFF DIRECTION:</span>
          {[
            { id: 'all', label: 'ALL ROUTES (10)' },
            { id: 'SURGE', label: 'SURGE (>2%)' },
            { id: 'NORMAL', label: 'NORMAL (0-2%)' },
            { id: 'EASED', label: 'EASED (<0%)' },
          ].map((f) => (
            <Button
              key={f.id}
              variant={filterStatus === f.id ? 'primary' : 'ghost'}
              size="xs"
              onClick={() => setFilterStatus(f.id)}
              className={
                filterStatus === f.id
                  ? 'bg-amber-signal/20 text-amber-signal border-amber-signal/40'
                  : 'text-secondary'
              }
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-secondary-muted text-[11px]">
          <span className="w-2 h-2 rounded-full bg-delta-negative" />
          <span>Fare Surge (Inflation)</span>
          <span className="w-2 h-2 rounded-full bg-delta-positive ml-2" />
          <span>Fare Eased (Deflation)</span>
        </div>
      </div>

      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={filteredData}
          keyExtractor={(row) => row.id}
        />
      ) : (
        /* Heatmap Matrix Tiles View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {filteredData.map((item) => {
            const isSurge = item.delta_percent > 0;
            const bgTint = isSurge
              ? 'bg-delta-negative/10 border-delta-negative/30 hover:border-delta-negative/60'
              : 'bg-delta-positive/10 border-delta-positive/30 hover:border-delta-positive/60';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded border transition-all flex flex-col justify-between gap-3 font-mono ${bgTint}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 font-bold text-xs text-primary">
                    <span>{item.origin_code}</span>
                    <ArrowRight className="w-3 h-3 text-amber-signal" />
                    <span>{item.destination_code}</span>
                  </div>
                  <TerminalBadge variant={isSurge ? 'red' : 'green'} size="xs">
                    {isSurge ? 'SURGE' : 'EASED'}
                  </TerminalBadge>
                </div>

                <div>
                  <div className="text-lg font-bold text-primary">
                    {formatINR(item.current_fare)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-secondary-muted mt-1">
                    <span>Base: {formatINR(item.baseline_fare)}</span>
                    <span className={isSurge ? 'text-delta-negative font-bold' : 'text-delta-positive font-bold'}>
                      {isSurge ? '+' : ''}{item.delta_percent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-subtle/50 text-[10px] text-secondary flex justify-between">
                  <span>T+1: {formatINR(item.t1_fare)}</span>
                  <span>T+45: {formatINR(item.t45_fare)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
