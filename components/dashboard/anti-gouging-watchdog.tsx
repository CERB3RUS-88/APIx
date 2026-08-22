'use client';

import * as React from 'react';
import { Panel, PanelHeader, PanelContent } from '@/components/ui/panel';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/utils';
import { AlertTriangle, ShieldAlert, ArrowRight, Eye, CheckCircle2, Bell } from 'lucide-react';

interface AnomalyAlert {
  id: string;
  route_id: string;
  origin_city: string;
  dest_city: string;
  window: string;
  observed_fare: number;
  baseline_fare: number;
  surge_pct: number;
  sigma_deviation: number;
  carrier: string;
  timestamp: string;
  reason: string;
  status: 'ACTIVE_INVESTIGATION' | 'MONITORING' | 'RESOLVED';
}

const LIVE_WATCHDOG_ALERTS: AnomalyAlert[] = [
  {
    id: 'alt_01',
    route_id: 'BOM-DEL',
    origin_city: 'Mumbai',
    dest_city: 'Delhi',
    window: 'T+1',
    observed_fare: 11450,
    baseline_fare: 5060,
    surge_pct: 126.3,
    sigma_deviation: 3.4,
    carrier: '6E / AI',
    timestamp: '2026-08-22 05:45 IST',
    reason: 'Severe evening bank slot compression & high business corridor load factor (>94%)',
    status: 'ACTIVE_INVESTIGATION',
  },
  {
    id: 'alt_02',
    route_id: 'DEL-CCU',
    origin_city: 'Delhi',
    dest_city: 'Kolkata',
    window: 'T+1',
    observed_fare: 11850,
    baseline_fare: 5655,
    surge_pct: 109.5,
    sigma_deviation: 3.1,
    carrier: '6E / SG',
    timestamp: '2026-08-22 06:00 IST',
    reason: 'Pre-festive advance inventory depletion on outbound eastern trunk',
    status: 'MONITORING',
  },
  {
    id: 'alt_03',
    route_id: 'MAA-DEL',
    origin_city: 'Chennai',
    dest_city: 'Delhi',
    window: 'T+1',
    observed_fare: 13850,
    baseline_fare: 6150,
    surge_pct: 125.2,
    sigma_deviation: 3.2,
    carrier: 'AI / 6E',
    timestamp: '2026-08-22 06:00 IST',
    reason: 'Monsoon weather rerouting causing morning flight capacity reduction',
    status: 'MONITORING',
  },
];

export function AntiGougingWatchdog() {
  const [alerts, setAlerts] = React.useState<AnomalyAlert[]>(LIVE_WATCHDOG_ALERTS);
  const [selectedAlert, setSelectedAlert] = React.useState<AnomalyAlert | null>(LIVE_WATCHDOG_ALERTS[0]);

  return (
    <div className="space-y-4">
      <Panel variant="highlight">
        <PanelHeader
          kicker="[REGULATORY SURVEILLANCE // MoCA & DGCA WATCHDOG]"
          title="FairFare Anti-Gouging & Dynamic Surge Alert Engine"
          statusDot="red"
          actions={
            <div className="flex items-center gap-2">
              <TerminalBadge variant="red" size="xs" dot>
                3 ACTIVE ANOMALIES (&gt;+3.0σ)
              </TerminalBadge>
            </div>
          }
        />

        <PanelContent className="p-4 sm:p-6 space-y-4 font-mono text-xs">
          <p className="text-secondary font-sans leading-relaxed">
            Automated regulatory watchdog auditing airline dynamic pricing algorithms against historical baseline fences.
            Corridors experiencing abnormal price surges exceeding <strong className="text-delta-negative font-mono">+3.0σ</strong> (standard deviations) are flagged for DGCA tariff scrutiny and anti-gouging audit.
          </p>

          {/* Anomaly Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {alerts.map((alt) => {
              const isSelected = selectedAlert?.id === alt.id;
              return (
                <div
                  key={alt.id}
                  onClick={() => setSelectedAlert(alt)}
                  className={`p-3.5 rounded border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-delta-negative/15 border-delta-negative/80 shadow-panel-elevated'
                      : 'bg-surface border-border-subtle hover:border-border-active'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 font-bold text-primary">
                      <span>{alt.route_id.split('-')[0]}</span>
                      <ArrowRight className="w-3 h-3 text-amber-signal" />
                      <span>{alt.route_id.split('-')[1]}</span>
                      <span className="text-[10px] text-secondary-muted font-normal">({alt.window})</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-delta-negative/20 text-delta-negative border border-delta-negative/30">
                      +{alt.surge_pct.toFixed(0)}% ({alt.sigma_deviation}σ)
                    </span>
                  </div>

                  <div>
                    <div className="text-base font-bold text-delta-negative">
                      {formatINR(alt.observed_fare)}
                    </div>
                    <div className="text-[10px] text-secondary-muted flex justify-between mt-0.5">
                      <span>Base: {formatINR(alt.baseline_fare)}</span>
                      <span>Surge: +{formatINR(alt.observed_fare - alt.baseline_fare)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border-subtle/50 text-[10px] text-secondary truncate">
                    {alt.reason}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Selected Alert Breakdown */}
          {selectedAlert && (
            <div className="p-4 rounded border border-border-subtle bg-surface-subtle/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-delta-negative" />
                  <span className="font-bold text-primary text-xs">
                    AUDIT DOSSIER: {selectedAlert.route_id} ({selectedAlert.origin_city} → {selectedAlert.dest_city})
                  </span>
                  <span className="text-[10px] text-secondary-muted">· {selectedAlert.timestamp}</span>
                </div>
                <p className="text-[11px] text-secondary font-sans leading-relaxed">
                  <strong>Trigger:</strong> {selectedAlert.reason}. Fare exceeds standard Tukey IQR fence by {selectedAlert.sigma_deviation} standard deviations above the 30-day moving average for {selectedAlert.window} horizon.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <TerminalBadge variant="default" size="xs">
                  {selectedAlert.status}
                </TerminalBadge>
              </div>
            </div>
          )}
        </PanelContent>
      </Panel>
    </div>
  );
}
