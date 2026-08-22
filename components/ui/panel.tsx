import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'highlight' | 'flat' | 'elevated';
  interactive?: boolean;
}

export function Panel({
  className,
  variant = 'default',
  interactive = false,
  children,
  ...props
}: PanelProps) {
  const baseStyles = 'relative rounded border transition-colors';

  const variants = {
    default: 'bg-surface border-border-subtle shadow-panel',
    highlight: 'bg-surface border-border-subtle shadow-panel border-t-2 border-t-amber-signal',
    flat: 'bg-surface-subtle border-border-subtle/60',
    elevated: 'bg-surface-elevated border-border-subtle shadow-panel-elevated',
  };

  const interactiveStyles = interactive
    ? 'hover:border-border-active hover:bg-surface-elevated cursor-pointer transition-all duration-150'
    : '';

  return (
    <div
      className={cn(baseStyles, variants[variant], interactiveStyles, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  kicker?: string;
  title?: string;
  statusDot?: 'amber' | 'green' | 'red' | 'muted';
  actions?: React.ReactNode;
}

export function PanelHeader({
  className,
  kicker,
  title,
  statusDot,
  actions,
  children,
  ...props
}: PanelHeaderProps) {
  const dotColors = {
    amber: 'bg-amber-signal shadow-[0_0_6px_rgba(232,163,61,0.6)] animate-pulse-subtle',
    green: 'bg-delta-positive shadow-[0_0_6px_rgba(79,169,140,0.6)]',
    red: 'bg-delta-negative shadow-[0_0_6px_rgba(217,99,74,0.6)]',
    muted: 'bg-secondary-muted',
  };

  return (
    <div
      className={cn(
        'px-4 py-3 border-b border-border-subtle/80 flex items-center justify-between gap-3',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {statusDot && (
          <span
            className={cn('w-2 h-2 rounded-full shrink-0', dotColors[statusDot])}
          />
        )}
        <div className="flex flex-col">
          {kicker && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-secondary-muted leading-none">
              {kicker}
            </span>
          )}
          {title && (
            <h3 className="font-display text-xs md:text-sm font-semibold tracking-tight text-primary mt-0.5">
              {title}
            </h3>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      {children}
    </div>
  );
}

export function PanelContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-4', className)} {...props}>
      {children}
    </div>
  );
}

export function PanelFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-4 py-2.5 bg-surface-subtle/50 border-t border-border-subtle/60 text-xs text-secondary flex items-center justify-between font-mono',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
