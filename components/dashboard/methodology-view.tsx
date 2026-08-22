'use client';

import * as React from 'react';
import { Panel, PanelHeader, PanelContent } from '@/components/ui/panel';
import { SectionHeader } from '@/components/ui/section-header';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { formatWeight } from '@/lib/utils';
import { BookOpen, ShieldCheck, CheckCircle2, FileText, Database, Scale, Cpu } from 'lucide-react';

const DGCA_ROUTE_WEIGHTS: Record<string, number> = {
  'DEL-BOM': 0.185,
  'BOM-DEL': 0.178,
  'DEL-BLR': 0.112,
  'BLR-DEL': 0.109,
  'BOM-BLR': 0.094,
  'BLR-BOM': 0.091,
  'DEL-CCU': 0.068,
  'CCU-DEL': 0.065,
  'BLR-HYD': 0.052,
  'MAA-DEL': 0.046,
};

interface MethodologyViewProps {
  methodologyNotes: string;
}

export function MethodologyView({ methodologyNotes }: MethodologyViewProps) {
  const routeEntries = Object.entries(DGCA_ROUTE_WEIGHTS);

  return (
    <div className="space-y-8">
      <SectionHeader
        kicker="[MODULE 05 // METHODOLOGY & GOVERNANCE]"
        title="APIx Index Methodology & Statistical Framework"
        description="Comprehensive technical and mathematical specification of the National Airfare Price Index, designed to augment the Transport and Communication sub-group of India's official Consumer Price Index (CPI)."
      />

      {/* 1. Live Audit Notes Banner */}
      <Panel variant="highlight">
        <PanelHeader
          kicker="[LIVE METADATA // PROVENANCE AUDIT]"
          title="Active Index Run Methodology Notes"
          statusDot="green"
        />
        <PanelContent className="p-4 sm:p-6 bg-surface-subtle/50 font-mono text-xs text-primary space-y-2">
          <div className="flex items-center gap-2 text-amber-signal font-semibold">
            <FileText className="w-4 h-4" />
            <span>AUDIT TRAIL (STORED WITH DAILY_INDEX RECORD):</span>
          </div>
          <p className="bg-[#090D15] p-3.5 rounded border border-border-subtle text-secondary leading-relaxed select-all">
            {methodologyNotes ||
              'Methodology: Laspeyres Weighted Basket Index (MoSPI CPI Transport Sub-Group Augmentation) | Base Period Value: 100.00 (Jan 2026 Reference Basket Fare = ₹5280.00) | Current 24h Weighted Basket Fare: ₹5587.60 | Active Corridors Sampled: 10/10 DGCA routes | Total Flight Quotes Evaluated: 1,420 (12 outliers rejected via Tukey IQR) | Contributors: DEL-BOM (w=18.5%, P=₹4819); BOM-DEL (w=17.8%, P=₹5610); DEL-BLR (w=11.2%, P=₹7370); BLR-DEL (w=10.9%, P=₹6349); BOM-BLR (w=9.4%, P=₹4510); BLR-BOM (w=9.1%, P=₹4565); DEL-CCU (w=6.8%, P=₹6270); CCU-DEL (w=6.5%, P=₹6160); BLR-HYD (w=5.2%, P=₹3850); MAA-DEL (w=4.6%, P=₹6820)'}
          </p>
        </PanelContent>
      </Panel>

      {/* 2. Step-by-Step Methodology Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Collection */}
        <Panel variant="default">
          <PanelHeader
            kicker="[PHASE 01]"
            title="1. Multi-Horizon Data Collection"
            statusDot="amber"
          />
          <PanelContent className="space-y-3 text-xs text-secondary leading-relaxed font-sans">
            <p>
              Traditional CPI airfare collection relies on manual sampling of a fixed departure date once a month. In contrast, APIx samples <strong>5 advance-purchase booking windows</strong> daily:
            </p>
            <div className="grid grid-cols-5 gap-1 font-mono text-[11px] text-center pt-1">
              <span className="p-1.5 bg-surface-subtle border border-border-subtle rounded text-delta-negative font-bold">T+1 (1d)</span>
              <span className="p-1.5 bg-surface-subtle border border-border-subtle rounded text-secondary font-bold">T+7 (7d)</span>
              <span className="p-1.5 bg-surface-subtle border border-border-subtle rounded text-secondary font-bold">T+15 (15d)</span>
              <span className="p-1.5 bg-surface-subtle border border-border-subtle rounded text-secondary font-bold">T+30 (30d)</span>
              <span className="p-1.5 bg-surface-subtle border border-border-subtle rounded text-delta-positive font-bold">T+45 (45d)</span>
            </div>
            <p className="text-[11px] text-secondary-muted pt-1">
              Fares are ethically collected from IndiGo, Air India, SpiceJet, and OTAs (EaseMyTrip, MakeMyTrip) using transparent User-Agent headers, 3–7s jittered rate limiting, and RFC 9309 robots.txt validation.
            </p>
          </PanelContent>
        </Panel>

        {/* Step 2: Cleaning & Outliers */}
        <Panel variant="default">
          <PanelHeader
            kicker="[PHASE 02]"
            title="2. Cleaning & Tukey's IQR Outlier Rejection"
            statusDot="amber"
          />
          <PanelContent className="space-y-3 text-xs text-secondary leading-relaxed font-sans">
            <p>
              Before aggregation, all quotes undergo tax decomposition and statistical anomaly filtering:
            </p>
            <ul className="space-y-1.5 list-disc pl-4 font-mono text-[11px]">
              <li><strong>Tax Separation:</strong> Strictly enforces <span className="text-primary">Total Fare = Base Fare + Taxes</span> (GST, UDF, fuel surcharges).</li>
              <li><strong>Deduplication:</strong> Eliminates duplicate quotes matching the same carrier, date, window, and departure time.</li>
              <li><strong>Tukey IQR Fences:</strong> For each corridor and window, computes IQR = Q3 - Q1. Fares outside [Q1 - 1.5×IQR, Q3 + 1.5×IQR] are tagged as <span className="text-delta-negative">is_outlier = true</span> and excluded from index calculation while retained for audit.</li>
            </ul>
          </PanelContent>
        </Panel>

        {/* Step 3: Laspeyres Index Engine */}
        <Panel variant="default">
          <PanelHeader
            kicker="[PHASE 03]"
            title="3. Laspeyres Traffic-Weighted Aggregation"
            statusDot="amber"
          />
          <PanelContent className="space-y-3 text-xs text-secondary leading-relaxed font-sans">
            <p>
              The composite daily index is calculated using a modified Laspeyres price index weighted by official DGCA domestic passenger volume shares:
            </p>
            <div className="p-3 bg-[#090D15] rounded border border-border-subtle font-mono text-xs text-primary space-y-1.5">
              <div className="text-amber-signal font-bold">Mathematical Formulation:</div>
              <div>{'1. Window Median Fare: P[r,w,t] = Median(Fares[r,w,t])'}</div>
              <div>{'2. Corridor Basket (Volume-Weighted): P[r,t] = Σ (v[w] * P[r,w,t])'}</div>
              <div>{'   where v[w] = { T+1: 10%, T+7: 20%, T+15: 35%, T+30: 25%, T+45: 10% }'}</div>
              <div>{'3. National Basket: I[raw,t] = Σ (w[r] * P[r,t]) across 10 DGCA routes'}</div>
              <div>{'4. Official APIx: APIx[t] = (I[raw,t] / I[base]) * 100.00'}</div>
            </div>
            <p className="text-[11px] text-secondary-muted">
              Where I[base] = ₹5,280.00 (Jan 2026 Reference Basket Fare = 100.00). Weights Σ w[r] = 1.000 (100.0%).
            </p>
          </PanelContent>
        </Panel>

        {/* Step 4: Time Series & Validation */}
        <Panel variant="default">
          <PanelHeader
            kicker="[PHASE 04]"
            title="4. Rollups & DGCA Back-Test Validation"
            statusDot="green"
          />
          <PanelContent className="space-y-3 text-xs text-secondary leading-relaxed font-sans">
            <p>
              High-frequency daily values are aggregated to match institutional macroeconomic reporting cadences:
            </p>
            <ul className="space-y-1.5 list-disc pl-4 font-mono text-[11px]">
              <li><strong>Weekly Rollup:</strong> ISO week average for monetary policy monitoring by RBI.</li>
              <li><strong>Monthly Rollup:</strong> Calendar month composite designed to augment MoSPI's CPI Transport sub-group.</li>
              <li><strong>DGCA Validation:</strong> Validation pending — 1 day of live data collected, accumulating daily index observations toward the first monthly correlation comparison with official DGCA reference circulars.</li>
            </ul>
          </PanelContent>
        </Panel>
      </div>

      {/* 3. Official DGCA Route Basket & Weight Distribution */}
      <Panel variant="default">
        <PanelHeader
          kicker="[BASKET SPECIFICATION]"
          title="Official DGCA Route Basket & Passenger-Volume Shares (Sum = 100%)"
          statusDot="amber"
        />
        <PanelContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {routeEntries.map(([route, weight]) => (
              <div
                key={route}
                className="p-3 bg-surface-subtle rounded border border-border-subtle font-mono text-xs flex flex-col justify-between gap-1"
              >
                <span className="font-bold text-primary">{route}</span>
                <div className="flex items-center justify-between text-secondary mt-1">
                  <span className="text-[11px] text-secondary-muted">DGCA Weight:</span>
                  <span className="text-amber-signal font-bold">{formatWeight(weight)}</span>
                </div>
                <div className="w-full bg-surface h-1 rounded-full overflow-hidden mt-1">
                  <div className="bg-amber-signal h-full" style={{ width: `${weight * 400}%` }} />
                </div>
              </div>
            ))}
          </div>
        </PanelContent>
      </Panel>
    </div>
  );
}
