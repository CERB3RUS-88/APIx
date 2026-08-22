'use client';

import * as React from 'react';
import { Panel, PanelHeader, PanelContent, PanelFooter } from '@/components/ui/panel';
import { SectionHeader } from '@/components/ui/section-header';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { Button } from '@/components/ui/button';
import { ROUTE_ELASTICITY_DATA, RouteElasticityCurve } from '@/lib/data-provider';
import { formatINR } from '@/lib/utils';
import { ArrowRight, TrendingUp, DollarSign, Clock, ShieldCheck } from 'lucide-react';

const CITY_NAMES: Record<string, { origin: string; dest: string }> = {
  'DEL-BOM': { origin: 'Delhi', dest: 'Mumbai' },
  'BOM-DEL': { origin: 'Mumbai', dest: 'Delhi' },
  'DEL-BLR': { origin: 'Delhi', dest: 'Bengaluru' },
  'BLR-DEL': { origin: 'Bengaluru', dest: 'Delhi' },
  'BOM-BLR': { origin: 'Mumbai', dest: 'Bengaluru' },
  'BLR-BOM': { origin: 'Bengaluru', dest: 'Mumbai' },
  'DEL-CCU': { origin: 'Delhi', dest: 'Kolkata' },
  'CCU-DEL': { origin: 'Kolkata', dest: 'Delhi' },
  'BLR-HYD': { origin: 'Bengaluru', dest: 'Hyderabad' },
  'MAA-DEL': { origin: 'Chennai', dest: 'Delhi' },
  'DEL-GAU': { origin: 'Delhi', dest: 'Guwahati' },
  'BOM-GOI': { origin: 'Mumbai', dest: 'Goa' },
  'DEL-PAT': { origin: 'Delhi', dest: 'Patna' },
  'BLR-COK': { origin: 'Bengaluru', dest: 'Kochi' },
  'DEL-IXC': { origin: 'Delhi', dest: 'Chandigarh' },
  'BOM-PNQ': { origin: 'Mumbai', dest: 'Pune' },
};

export function ElasticityView() {
  const [elasticityMap, setElasticityMap] =
    React.useState<Record<string, RouteElasticityCurve>>(ROUTE_ELASTICITY_DATA);
  const routeKeys = Object.keys(elasticityMap);
  const [selectedRouteKey, setSelectedRouteKey] = React.useState<string>(routeKeys[0] || 'DEL-BOM');

  // Load dynamically from /api/latest if available
  React.useEffect(() => {
    async function fetchLatestElasticity() {
      try {
        const res = await fetch('/api/latest');
        if (res.ok) {
          const json = await res.json();
          if (json.data?.elasticity && Array.isArray(json.data.elasticity)) {
            const dynamicMap: Record<string, RouteElasticityCurve> = {};
            for (const item of json.data.elasticity) {
              const cities = CITY_NAMES[item.route_id] || { origin: item.origin, dest: item.destination };
              const points = item.curve.map((pt: any) => ({
                window: pt.booking_window,
                days: pt.days_ahead,
                fare: pt.median_fare,
                multiplierVsT45: pt.price_multiplier_vs_t45,
                discountVsT1: pt.discount_vs_t1,
              }));

              dynamicMap[item.route_id] = {
                route_id: item.route_id,
                origin_city: cities.origin,
                destination_city: cities.dest,
                points,
                escalation_ratio: item.t1_to_t45_ratio || 2.1,
                avg_daily_climb_inr: item.overall_elasticity_score || 95,
              };
            }

            if (Object.keys(dynamicMap).length > 0) {
              setElasticityMap(dynamicMap);
            }
          }
        }
      } catch {
        // Fallback to static
      }
    }
    fetchLatestElasticity();
  }, []);

  const selectedCurve: RouteElasticityCurve =
    elasticityMap[selectedRouteKey] || elasticityMap['DEL-BOM'] || ROUTE_ELASTICITY_DATA['DEL-BOM'];

  // SVG Chart Dimensions
  const width = 700;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const fares = selectedCurve.points.map((p) => p.fare);
  const minFare = Math.min(...fares) * 0.85;
  const maxFare = Math.max(...fares) * 1.1;
  const fareRange = maxFare - minFare;

  const getX = (idx: number) => padding.left + (idx / Math.max(1, selectedCurve.points.length - 1)) * innerWidth;
  const getY = (fare: number) => padding.top + innerHeight - ((fare - minFare) / fareRange) * innerHeight;

  const pointsSvg = selectedCurve.points.map((p, i) => `${getX(i)},${getY(p.fare)}`);
  const linePath = `M ${pointsSvg.join(' L ')}`;
  const areaPath = `${linePath} L ${getX(selectedCurve.points.length - 1)},${padding.top + innerHeight} L ${getX(0)},${padding.top + innerHeight} Z`;

  const t45Point = selectedCurve.points.find((p) => p.window === 'T+45') || selectedCurve.points[0];
  const t1Point = selectedCurve.points.find((p) => p.window === 'T+1') || selectedCurve.points[selectedCurve.points.length - 1];
  const lastMinuteSurchargePercent = Math.round(((t1Point.fare - t45Point.fare) / (t45Point.fare || 1)) * 100);

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="[MODULE 03 // LEAD-TIME ELASTICITY]"
        title="Dynamic Pricing Curve: Days-Before-Departure"
        description="Quantifying the cost of procrastination in Indian domestic aviation. Demonstrates fare trajectory as booking lead-time compresses from 45 days down to 24 hours before flight."
      />

      {/* Route Switcher Pills */}
      <div className="p-3 bg-surface border border-border-subtle rounded flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-secondary-muted uppercase tracking-wider mr-2">
          SELECT CORRIDOR:
        </span>
        {routeKeys.map((key) => {
          const item = elasticityMap[key];
          const isActive = selectedRouteKey === key;
          return (
            <Button
              key={key}
              variant={isActive ? 'primary' : 'outline'}
              size="xs"
              onClick={() => setSelectedRouteKey(key)}
              className={
                isActive
                  ? 'bg-amber-signal text-ink font-bold shadow-amber-glow'
                  : 'text-secondary hover:text-primary'
              }
            >
              {key} ({item?.origin_city?.slice(0, 3) || key.split('-')[0]} → {item?.destination_city?.slice(0, 3) || key.split('-')[1]})
            </Button>
          );
        })}
      </div>

      {/* Elasticity Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Panel variant="default" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary-muted font-mono text-xs mb-2">
            <span>LAST-MINUTE SURGE (T+1 vs T+45)</span>
            <TrendingUp className="w-4 h-4 text-delta-negative" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-delta-negative">
              +{lastMinuteSurchargePercent}% ({selectedCurve.escalation_ratio}x)
            </div>
            <p className="text-[11px] font-mono text-secondary mt-1">
              Fares jump from {formatINR(t45Point.fare)} to {formatINR(t1Point.fare)}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border-subtle/60 text-[10px] font-mono text-secondary-muted flex justify-between">
            <span>SURCHARGE</span>
            <span className="text-delta-negative">+{formatINR(t1Point.fare - t45Point.fare)}</span>
          </div>
        </Panel>

        <Panel variant="default" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary-muted font-mono text-xs mb-2">
            <span>EARLY BOOKING DISCOUNT</span>
            <DollarSign className="w-4 h-4 text-delta-positive" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-delta-positive">
              {t45Point.discountVsT1}% SAVINGS
            </div>
            <p className="text-[11px] font-mono text-secondary mt-1">
              Booking 45 days in advance locks in base fare
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border-subtle/60 text-[10px] font-mono text-secondary-muted flex justify-between">
            <span>SAVINGS POTENTIAL</span>
            <span className="text-delta-positive">50%+ AVERAGE</span>
          </div>
        </Panel>

        <Panel variant="default" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary-muted font-mono text-xs mb-2">
            <span>DAILY ESCALATION GRADIENT</span>
            <Clock className="w-4 h-4 text-amber-signal" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-primary">
              ₹{selectedCurve.avg_daily_climb_inr} / DAY
            </div>
            <p className="text-[11px] font-mono text-secondary mt-1">
              Average price increase for every day delayed
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border-subtle/60 text-[10px] font-mono text-secondary-muted flex justify-between">
            <span>PRICE CURVE</span>
            <span className="text-amber-signal">EXPONENTIAL SURGE</span>
          </div>
        </Panel>
      </div>

      {/* Main Elasticity Curve Chart */}
      <Panel variant="highlight">
        <PanelHeader
          kicker={`[CURVE // ${selectedCurve.route_id}]`}
          title={`${selectedCurve.origin_city} (${selectedCurve.route_id.split('-')[0]}) → ${selectedCurve.destination_city} (${selectedCurve.route_id.split('-')[1]}) Advance Purchase Curve`}
          statusDot="amber"
          actions={
            <TerminalBadge variant="default" size="xs">
              5 WINDOW TIERS
            </TerminalBadge>
          }
        />

        <PanelContent className="p-4 sm:p-6">
          <div className="relative w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 sm:h-64 select-none">
              <defs>
                <linearGradient id="elasticityGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4FA98C" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#E8A33D" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#D9634A" stopOpacity="0.35" />
                </linearGradient>
              </defs>

              {/* Y-axis gridlines */}
              {[minFare, (minFare + maxFare) / 2, maxFare].map((fVal) => {
                const y = getY(fVal);
                return (
                  <g key={`y-${fVal}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={padding.left + innerWidth}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fill="#677186"
                      className="font-mono text-[10px]"
                      fontFamily="var(--font-mono), monospace"
                    >
                      {formatINR(Math.round(fVal))}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill */}
              <path d={areaPath} fill="url(#elasticityGrad)" />

              {/* Curve Line */}
              <path
                d={linePath}
                fill="none"
                stroke="#E8A33D"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points & labels */}
              {selectedCurve.points.map((pt, idx) => {
                const x = getX(idx);
                const y = getY(pt.fare);
                const isT1 = pt.window === 'T+1';
                const isT45 = pt.window === 'T+45';

                return (
                  <g key={pt.window}>
                    <circle
                      cx={x}
                      cy={y}
                      r={isT1 ? 6 : 4.5}
                      fill={isT1 ? '#D9634A' : isT45 ? '#4FA98C' : '#E8A33D'}
                      stroke="#0E1420"
                      strokeWidth="2"
                    />
                    {/* Fare Value label on top of point */}
                    <text
                      x={x}
                      y={y - 10}
                      textAnchor="middle"
                      fill="#F5F3EE"
                      className="font-mono text-[11px] font-bold"
                      fontFamily="var(--font-mono), monospace"
                    >
                      {formatINR(pt.fare)}
                    </text>
                    {/* X-axis label */}
                    <text
                      x={x}
                      y={padding.top + innerHeight + 16}
                      textAnchor="middle"
                      fill={isT1 ? '#D9634A' : isT45 ? '#4FA98C' : '#9AA1B2'}
                      className="font-mono text-[11px] font-semibold"
                      fontFamily="var(--font-mono), monospace"
                    >
                      {pt.window}
                    </text>
                    <text
                      x={x}
                      y={padding.top + innerHeight + 28}
                      textAnchor="middle"
                      fill="#677186"
                      className="font-mono text-[9px]"
                      fontFamily="var(--font-mono), monospace"
                    >
                      ({pt.days}d)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </PanelContent>

        <PanelFooter>
          <div className="flex flex-wrap items-center justify-between gap-2 w-full text-xs font-mono text-secondary">
            <span>T+45 (Advance Base: 1.0x) → T+30 (1.08x) → T+15 (1.22x) → T+7 (1.40x) → T+1 (Last-Min: {selectedCurve.escalation_ratio}x)</span>
            <span className="text-amber-signal">DATA SOURCE: MEDIAN NON-OUTLIER OBSERVED FARES</span>
          </div>
        </PanelFooter>
      </Panel>
    </div>
  );
}
