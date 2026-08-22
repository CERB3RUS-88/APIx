import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SectionHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function SectionHeader({
  kicker,
  title,
  description,
  actions,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-border-subtle/80 mb-6',
        className
      )}
      {...props}
    >
      <div>
        {kicker && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-signal uppercase">
              {kicker}
            </span>
          </div>
        )}
        <h2 className="font-display text-lg md:text-xl font-bold tracking-tight text-primary">
          {title}
        </h2>
        {description && (
          <p className="text-xs md:text-sm text-secondary mt-0.5 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
