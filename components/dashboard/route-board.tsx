'use client';

import * as React from 'react';
import { Panel, PanelHeader, PanelFooter } from '@/components/ui/panel';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { DeltaBadge } from '@/components/ui/delta-badge';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { Button } from '@/components/ui/button';
import { formatINR, formatWeight } from '@/lib/utils';
import { RouteIndexSummary } from '@/types';
import { ArrowRight, Plane, Filter, Download } from 'lucide-react';

interface RouteBoardProps {
  routes: RouteIndexSummary[];
}

export function RouteBoard({ routes }: RouteBoardProps) {
  const [filterWindow, setFilterWindow] = React.useState<string>('all');
  const [selectedRoute, setSelectedRoute] = React.useState<RouteIndexSummary | null>(null);

  const columns: ColumnDef<RouteIndexSummary>[] = [
    {
      id: 'route_code',
      header: 'ROUTE / CORRIDOR',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5 py-1">
          <div className="flex items-center gap-1 font-mono font-bold text-xs text-primary bg-surface-elevated px-2 py-1 rounded border border-border-subtle">
            <span>{row.route.origin_code}</span>
            <ArrowRight className="w-3 h-3 text-amber-signal" />
            <span>{row.route.destination_code}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-sans text-secondary truncate">
              {row.route.origin_city} → {row.route.destination_city}
            </span>
            <span className="text-[10px] font-mono text-secondary-muted">
              {row.route.distance_km} km · ~{row.route.daily_flights_avg} flt/day
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'dgca_weight',
      header: 'DGCA WEIGHT',
      sortable: true,
      align: 'left',
      accessorKey: 'index_contribution',
      cell: (row) => (
        <div className="flex flex-col gap-1 w-28">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="font-semibold text-primary">
              {formatWeight(row.route.dgca_traffic_weight)}
            </span>
            <span className="text-secondary-muted">share</span>
          </div>
          <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden border border-border-subtle/50">
            <div
              className="bg-amber-signal h-full rounded-full"
              style={{ width: `${row.route.dgca_traffic_weight * 350}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'representative_fare',
      header: 'MEDIAN FARE',
      sortable: true,
      align: 'right',
      cell: (row) => (
        <span className="font-mono font-semibold text-primary text-xs">
          {formatINR(row.representative_fare)}
        </span>
      ),
    },
    {
      id: 't1_fare',
      header: 'T+1 FARE',
      sortable: true,
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-xs text-delta-negative/90">
          {formatINR(row.t1_fare)}
        </span>
      ),
    },
    {
      id: 't7_fare',
      header: 'T+7 FARE',
      sortable: true,
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-xs text-secondary">
          {formatINR(row.t7_fare)}
        </span>
      ),
    },
    {
      id: 't15_fare',
      header: 'T+15 FARE',
      sortable: true,
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-xs text-secondary">
          {formatINR(row.t15_fare)}
        </span>
      ),
    },
    {
      id: 't30_fare',
      header: 'T+30 FARE',
      sortable: true,
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-xs text-delta-positive/90">
          {formatINR(row.t30_fare)}
        </span>
      ),
    },
    {
      id: 'delta_24h',
      header: '24H DELTA',
      sortable: true,
      align: 'center',
      cell: (row) => <DeltaBadge value={row.delta_24h} size="xs" />,
    },
    {
      id: 'carriers',
      header: 'CARRIERS',
      align: 'center',
      cell: (row) => (
        <div className="flex items-center gap-1 justify-center">
          {row.carriers_sampled.map((c) => (
            <span
              key={c}
              className="text-[10px] font-mono px-1 py-0.5 rounded bg-surface-elevated text-secondary-muted border border-border-subtle"
            >
              {c}
            </span>
          ))}
        </div>
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
          <TerminalBadge
            variant={variantMap[row.status] || 'default'}
            size="xs"
            dot
          >
            {row.status}
          </TerminalBadge>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Panel variant="default">
        <PanelHeader
          kicker="[DEPARTURE BOARD // BASKET TELEMETRY]"
          title="NATIONAL ROUTE BASKET & HIGH-FREQUENCY FARE TIERS"
          statusDot="amber"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="xs" className="hidden sm:inline-flex">
                <Download className="w-3 h-3 mr-1" />
                EXPORT CSV
              </Button>
              <TerminalBadge variant="default" size="xs">
                10 CORRIDORS ACTIVE
              </TerminalBadge>
            </div>
          }
        />

        <div className="p-4 border-b border-border-subtle/60 bg-surface-subtle/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-secondary-muted" />
            <span className="text-secondary-muted">LEAD-TIME FILTER:</span>
            {['all', 'T+1', 'T+7', 'T+15', 'T+30', 'T+45'].map((w) => (
              <Button
                key={w}
                variant={filterWindow === w ? 'primary' : 'ghost'}
                size="xs"
                onClick={() => setFilterWindow(w)}
                className={
                  filterWindow === w
                    ? 'bg-amber-signal/20 text-amber-signal border-amber-signal/40'
                    : 'text-secondary'
                }
              >
                {w.toUpperCase()}
              </Button>
            ))}
          </div>
          <span className="text-secondary-muted text-[11px]">
            LAST AUTOMATED SCRAPE RUN: TODAY 06:00 IST · VERIFIED CLEAN
          </span>
        </div>

        <DataTable
          columns={columns}
          data={routes}
          keyExtractor={(row) => row.route.id}
          onRowClick={(row) => setSelectedRoute(row)}
        />

        <PanelFooter>
          <div className="flex items-center gap-4 text-secondary text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-delta-negative" />
              <span>Surge (&gt;2% inflation)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-delta-positive" />
              <span>Eased (&gt;1% deflation)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary-muted" />
              <span>Stable</span>
            </div>
          </div>

          <div className="text-[11px] text-secondary-muted">
            METHODOLOGY: MEDIAN FARE ACROSS INDIGO, AIR INDIA, SPICEJET, AKASA & OTAS
          </div>
        </PanelFooter>
      </Panel>
    </div>
  );
}
