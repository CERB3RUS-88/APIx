import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DeltaBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number; // percentage change, e.g. +1.42 or -0.85
  format?: 'percent' | 'points';
  invertColors?: boolean; // if true, positive is green and negative is red. Default: negative fares = green (deflation), positive fares = red (inflation)
  size?: 'xs' | 'sm' | 'md';
  prefix?: string;
  suffix?: string;
}

export function DeltaBadge({
  value,
  format = 'percent',
  invertColors = false,
  size = 'sm',
  prefix,
  suffix,
  className,
  ...props
}: DeltaBadgeProps) {
  const isZero = Math.abs(value) < 0.001;
  const isUp = value > 0;
  
  // In MoSPI / consumer economics:
  // Fare down = positive development for passenger = green (#4FA98C)
  // Fare up = price surge/inflation = red/coral (#D9634A)
  // When invertColors is true, standard financial returns apply (up=green, down=red)
  const isGood = invertColors ? isUp : !isUp;

  const colorClass = isZero
    ? 'text-secondary-muted bg-surface-elevated border-border-subtle'
    : isGood
    ? 'text-delta-positive bg-delta-positive/10 border-delta-positive/25'
    : 'text-delta-negative bg-delta-negative/10 border-delta-negative/25';

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-0.5',
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  const arrow = isZero ? '—' : isUp ? '▲' : '▼';
  const sign = isUp ? '+' : '';
  const displayVal = format === 'percent' ? `${sign}${value.toFixed(2)}%` : `${sign}${value.toFixed(2)} pts`;

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-medium rounded border tracking-tight tabular-nums select-none',
        colorClass,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span className="text-[9px] leading-none opacity-80">{arrow}</span>
      <span>
        {prefix}
        {displayVal}
        {suffix}
      </span>
    </span>
  );
}
