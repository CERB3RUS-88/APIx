import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TerminalBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'amber' | 'green' | 'red' | 'outline' | 'subtle';
  size?: 'xs' | 'sm';
  dot?: boolean;
}

export function TerminalBadge({
  variant = 'default',
  size = 'sm',
  dot = false,
  className,
  children,
  ...props
}: TerminalBadgeProps) {
  const variants = {
    default: 'bg-surface-elevated text-primary border-border-subtle',
    amber: 'bg-amber-signal/10 text-amber-signal border-amber-signal/30',
    green: 'bg-delta-positive/10 text-delta-positive border-delta-positive/30',
    red: 'bg-delta-negative/10 text-delta-negative border-delta-negative/30',
    outline: 'bg-transparent text-secondary border-border-subtle',
    subtle: 'bg-surface-subtle text-secondary-muted border-transparent',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1 font-mono tracking-wider uppercase',
    sm: 'px-2 py-0.5 text-[11px] gap-1.5 font-mono tracking-wider uppercase',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border font-medium select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            variant === 'amber'
              ? 'bg-amber-signal animate-pulse-subtle'
              : variant === 'green'
              ? 'bg-delta-positive'
              : variant === 'red'
              ? 'bg-delta-negative'
              : 'bg-secondary-muted'
          )}
        />
      )}
      {children}
    </span>
  );
}
