'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { MonthlyBasketComparison } from '@/lib/validation-data';
import { formatINR, formatIndexValue } from '@/lib/utils';
import { TrendingUp, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

interface ValidationChartProps {
  data: MonthlyBasketComparison[];
  distinctDatesCount?: number;
}

type ViewMode = 'inr' | 'index';

export function ValidationChart({ data, distinctDatesCount = 2 }: ValidationChartProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('inr');
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  const daysLabel = `${distinctDatesCount} ${distinctDatesCount === 1 ? 'day' : 'days'}`;
  const daysLabelUpper = `${distinctDatesCount} ${distinctDatesCount === 1 ? 'DAY' : 'DAYS'}`;

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-[280px] w-full rounded border border-border-subtle/60 bg-surface-subtle/30 flex flex-col items-center justify-center p-6 text-center">
          <Clock className="w-8 h-8 text-amber-signal mb-3 animate-pulse-subtle" />
          <div className="font-mono text-sm font-bold text-primary uppercase">
            Live Validation Data Accumulation Phase
          </div>
          <p className="font-mono text-xs text-secondary max-w-md mt-2 leading-relaxed">
            Validation pending — {daysLabel} of live data collected, accumulating toward first comparison against official DGCA circulars (minimum N ≥ 2 overlapping monthly periods required).
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-surface-elevated rounded border border-border-subtle text-[11px] font-mono text-amber-signal">
            <span className="w-2 h-2 rounded-full bg-amber-signal animate-pulse-subtle" />
            <span>DAILY AUTOMATED CRON ACTIVE (00:00 & 05:30 IST)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-secondary pt-1">
          <div className="flex items-center gap-2 text-amber-signal">
            <Clock className="w-4 h-4" />
            <span>VALIDATION PENDING — {daysLabelUpper} OF LIVE DATA COLLECTED, ACCUMULATING TOWARD FIRST COMPARISON</span>
          </div>
        </div>
      </div>
    );
  }

  // SVG Chart Dimensions
  const width = 850;
  const height = 280;
  const padding = { top: 25, right: 35, bottom: 40, left: 65 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Extract values based on viewMode
  const apixValues = data.map((d) => (viewMode === 'inr' ? d.apix_basket_fare : d.apix_index_value));
  const dgcaValues = data.map((d) => (viewMode === 'inr' ? d.dgca_basket_fare : d.dgca_index_value));

  const allVals = [...apixValues, ...dgcaValues];
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const margin = (rawMax - rawMin) * 0.12;

  const minVal = viewMode === 'inr' ? Math.floor((rawMin - margin) / 100) * 100 : Math.floor(rawMin - margin);
  const maxVal = viewMode === 'inr' ? Math.ceil((rawMax + margin) / 100) * 100 : Math.ceil(rawMax + margin);
  const valRange = maxVal - minVal;

  const getX = (idx: number) =>
    Number((padding.left + (idx / Math.max(1, data.length - 1)) * innerWidth).toFixed(2));
  const getY = (val: number) =>
    Number((padding.top + innerHeight - ((val - minVal) / valRange) * innerHeight).toFixed(2));

  // Paths
  const apixPoints = data.map((d, i) => `${getX(i)},${getY(viewMode === 'inr' ? d.apix_basket_fare : d.apix_index_value)}`);
  const dgcaPoints = data.map((d, i) => `${getX(i)},${getY(viewMode === 'inr' ? d.dgca_basket_fare : d.dgca_index_value)}`);

  const apixLinePath = `M ${apixPoints.join(' L ')}`;
  const dgcaLinePath = `M ${dgcaPoints.join(' L ')}`;

  // Area between curves (variance ribbon)
  const ribbonPath = `M ${apixPoints.join(' L ')} L ${dgcaPoints.slice().reverse().join(' L ')} Z`;

  // Active Point
  const activeIdx = hoverIndex !== null && data[hoverIndex] ? hoverIndex : data.length - 1;
  const activeItem = data[activeIdx];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;

    if (svgX < padding.left || svgX > padding.left + innerWidth) {
      setHoverIndex(null);
      return;
    }

    const ratio = (svgX - padding.left) / innerWidth;
    const targetIdx = Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1))));
    setHoverIndex(targetIdx);
  };

  // Y-axis ticks
  const yTicks = [
    minVal,
    minVal + valRange * 0.25,
    minVal + valRange * 0.5,
    minVal + valRange * 0.75,
    maxVal,
  ];

  return (
    <div className="space-y-4">
      {/* Chart Top Switcher & Active Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs text-primary">
            <span className="text-secondary-muted uppercase">MONTH:</span>
            <span className="font-bold text-primary">{activeItem.month_label}</span>
          </div>
          <span className="text-border-subtle">|</span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-signal" />
            <span className="text-secondary-muted">APIx:</span>
            <span className="text-amber-signal font-bold">
              {viewMode === 'inr' ? formatINR(activeItem.apix_basket_fare) : formatIndexValue(activeItem.apix_index_value)}
            </span>
          </div>
          <span className="text-border-subtle">|</span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="w-2 h-2 rounded-sm bg-sky-400" />
            <span className="text-secondary-muted">DGCA:</span>
            <span className="text-sky-400 font-bold">
              {viewMode === 'inr' ? formatINR(activeItem.dgca_basket_fare) : formatIndexValue(activeItem.dgca_index_value)}
            </span>
          </div>
          <span className="text-border-subtle">|</span>
          <div className="flex items-center gap-1 font-mono text-xs text-delta-positive bg-delta-positive/10 px-2 py-0.5 rounded border border-delta-positive/30">
            <span>Δ +₹{activeItem.variance_inr}</span>
            <span className="text-[10px]">({activeItem.variance_pct > 0 ? '+' : ''}{activeItem.variance_pct}%)</span>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded border border-border-subtle">
          <Button
            variant={viewMode === 'inr' ? 'primary' : 'ghost'}
            size="xs"
            onClick={() => setViewMode('inr')}
            className={
              viewMode === 'inr'
                ? 'bg-amber-signal text-ink font-bold'
                : 'text-secondary hover:text-primary'
            }
          >
            INR BASKET (₹)
          </Button>
          <Button
            variant={viewMode === 'index' ? 'primary' : 'ghost'}
            size="xs"
            onClick={() => setViewMode('index')}
            className={
              viewMode === 'index'
                ? 'bg-amber-signal text-ink font-bold'
                : 'text-secondary hover:text-primary'
            }
          >
            NORMALIZED INDEX (100.00)
          </Button>
        </div>
      </div>

      {/* SVG Dual-Line Comparison Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-64 sm:h-72 select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="ribbonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8A33D" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.10" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {yTicks.map((yVal, i) => {
            const y = getY(yVal);
            return (
              <g key={`ytick-${i}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.07)"
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
                  {viewMode === 'inr' ? `₹${Math.round(yVal)}` : yVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Variance Ribbon Between Curves */}
          <path d={ribbonPath} fill="url(#ribbonGrad)" />

          {/* DGCA Reference Tariff Line (Sky Blue) */}
          <path
            d={dgcaLinePath}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* APIx Computed Curve (Amber Gold) */}
          <path
            d={apixLinePath}
            fill="none"
            stroke="#E8A33D"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Individual Data Markers */}
          {data.map((d, idx) => {
            const x = getX(idx);
            const yApix = getY(viewMode === 'inr' ? d.apix_basket_fare : d.apix_index_value);
            const yDgca = getY(viewMode === 'inr' ? d.dgca_basket_fare : d.dgca_index_value);

            return (
              <g key={d.month}>
                {/* DGCA Square Marker */}
                <rect
                  x={x - 3.5}
                  y={yDgca - 3.5}
                  width="7"
                  height="7"
                  fill="#38BDF8"
                  stroke="#0E1420"
                  strokeWidth="1.5"
                />
                {/* APIx Circle Marker */}
                <circle
                  cx={x}
                  cy={yApix}
                  r="4"
                  fill="#E8A33D"
                  stroke="#0E1420"
                  strokeWidth="1.5"
                />

                {/* X-axis Month Label */}
                <text
                  x={x}
                  y={padding.top + innerHeight + 18}
                  textAnchor="middle"
                  fill="#9AA1B2"
                  className="font-mono text-[10px]"
                  fontFamily="var(--font-mono), monospace"
                >
                  {d.month.slice(5)}/{d.month.slice(2, 4)}
                </text>
              </g>
            );
          })}

          {/* Active Hover Crosshair Line */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + innerHeight}
                stroke="#F5F3EE"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeOpacity="0.6"
              />
              {/* Highlight Rings */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(viewMode === 'inr' ? data[hoverIndex].apix_basket_fare : data[hoverIndex].apix_index_value)}
                r="6"
                fill="none"
                stroke="#E8A33D"
                strokeWidth="2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(viewMode === 'inr' ? data[hoverIndex].dgca_basket_fare : data[hoverIndex].dgca_index_value)}
                r="6"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Legend & Verification Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-secondary pt-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-signal inline-block" />
            <span className="text-primary font-semibold">APIx COMPUTED FARE BASKET</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-sky-400 inline-block" />
            <span className="text-sky-400 font-semibold">DGCA OFFICIAL MONTHLY TARIFF</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-amber-signal/20 border border-amber-signal/30 inline-block" />
            <span className="text-secondary-muted">TRACKING VARIANCE RIBBON</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-amber-signal">
          <Clock className="w-4 h-4" />
          <span>VALIDATION PENDING — {daysLabelUpper} OF LIVE DATA COLLECTED, ACCUMULATING TOWARD FIRST COMPARISON</span>
        </div>
      </div>
    </div>
  );
}
