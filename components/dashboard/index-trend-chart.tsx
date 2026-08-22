'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { DeltaBadge } from '@/components/ui/delta-badge';
import { TimeSeriesPoint, TIME_SERIES_30D, TIME_SERIES_90D, TIME_SERIES_365D } from '@/lib/data-provider';
import { formatIndexValue } from '@/lib/utils';
import { Calendar, TrendingUp } from 'lucide-react';

type HorizonOption = '30D' | '90D' | '365D';

export function IndexTrendChart() {
  const [horizon, setHorizon] = React.useState<HorizonOption>('90D');
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const data: TimeSeriesPoint[] = React.useMemo(() => {
    switch (horizon) {
      case '30D':
        return TIME_SERIES_30D;
      case '90D':
        return TIME_SERIES_90D;
      case '365D':
        return TIME_SERIES_365D;
      default:
        return TIME_SERIES_90D;
    }
  }, [horizon]);

  // Chart dimensions & scaling
  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 35, left: 55 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const minVal = Math.min(...data.map((d) => d.apix), 96.0);
  const maxVal = Math.max(...data.map((d) => d.apix), 116.0);
  const yRange = maxVal - minVal;

  const getX = (idx: number) =>
    Number((padding.left + (idx / Math.max(1, data.length - 1)) * innerWidth).toFixed(2));
  const getY = (val: number) =>
    Number((padding.top + innerHeight - ((val - minVal) / yRange) * innerHeight).toFixed(2));

  // Build SVG Path
  const points = data.map((d, i) => `${getX(i)},${getY(d.apix)}`);
  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${getX(data.length - 1)},${(padding.top + innerHeight).toFixed(2)} L ${getX(0)},${(padding.top + innerHeight).toFixed(2)} Z`;

  // Base 100 baseline Y
  const base100Y = getY(100.0);

  // Active hover point
  const activePoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : data[data.length - 1];

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

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Y-axis ticks
  const yTicks = [
    minVal,
    minVal + yRange * 0.25,
    100.0,
    minVal + yRange * 0.75,
    maxVal,
  ].filter((v, idx, arr) => arr.indexOf(v) === idx);

  // X-axis label samples
  const xStep = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  return (
    <div className="space-y-4">
      {/* Chart Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-primary font-mono text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-amber-signal" />
            <span className="text-secondary-muted uppercase">SELECTED DATE:</span>
            <span className="font-bold text-primary">{activePoint.date}</span>
          </div>
          <span className="text-border-subtle">|</span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-secondary-muted">APIx:</span>
            <span className="text-amber-signal font-bold">{formatIndexValue(activePoint.apix)}</span>
          </div>
          <DeltaBadge value={activePoint.delta24h} size="xs" />
        </div>

        {/* Time Horizon Switcher */}
        <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded border border-border-subtle">
          {(['30D', '90D', '365D'] as HorizonOption[]).map((h) => (
            <Button
              key={h}
              variant={horizon === h ? 'primary' : 'ghost'}
              size="xs"
              onClick={() => {
                setHorizon(h);
                setHoverIndex(null);
              }}
              className={
                horizon === h
                  ? 'bg-amber-signal text-ink font-bold'
                  : 'text-secondary hover:text-primary'
              }
            >
              {h}
            </Button>
          ))}
        </div>
      </div>

      {/* SVG Hairline Line Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 sm:h-64 md:h-72 select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="apixAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8A33D" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#E8A33D" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#E8A33D" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Hairline Gridlines */}
          {yTicks.map((yVal) => {
            const y = getY(yVal);
            return (
              <g key={`ytick-${yVal}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeWidth="1"
                  strokeDasharray={yVal === 100 ? '4 4' : undefined}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill={yVal === 100 ? '#E8A33D' : '#677186'}
                  className="font-mono text-[10px]"
                  fontFamily="var(--font-mono), monospace"
                >
                  {yVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Base 100 Reference Line */}
          {base100Y >= padding.top && base100Y <= padding.top + innerHeight && (
            <line
              x1={padding.left}
              y1={base100Y}
              x2={padding.left + innerWidth}
              y2={base100Y}
              stroke="#E8A33D"
              strokeWidth="1"
              strokeDasharray="3 3"
              strokeOpacity="0.6"
            />
          )}

          {/* Gradient Area Fill */}
          <path d={areaPath} fill="url(#apixAreaGrad)" />

          {/* Main APIx Index Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#E8A33D"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X-axis ticks and labels */}
          {xLabels.map((pt) => {
            const idx = data.indexOf(pt);
            const x = getX(idx);
            return (
              <g key={`xtick-${pt.date}`}>
                <line
                  x1={x}
                  y1={padding.top + innerHeight}
                  x2={x}
                  y2={padding.top + innerHeight + 4}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={padding.top + innerHeight + 18}
                  textAnchor="middle"
                  fill="#677186"
                  className="font-mono text-[10px]"
                  fontFamily="var(--font-mono), monospace"
                >
                  {pt.date.slice(5)} {/* MM-DD */}
                </text>
              </g>
            );
          })}

          {/* Hover Crosshair & Point Highlight */}
          {hoverIndex !== null && (
            <g>
              {/* Vertical Crosshair Line */}
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + innerHeight}
                stroke="#F5F3EE"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeOpacity="0.5"
              />
              {/* Highlight Dot */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(data[hoverIndex].apix)}
                r="4.5"
                fill="#E8A33D"
                stroke="#0E1420"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Axis Footer Annotations */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-secondary-muted pt-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-0.5 bg-amber-signal inline-block" />
          <span>NATIONAL AIRFARE PRICE INDEX (DAILY 06:00 IST)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-0.5 border-t border-dashed border-amber-signal/60 inline-block" />
          <span>BASE PERIOD (JAN 2026 = 100.00)</span>
        </div>
      </div>
    </div>
  );
}
