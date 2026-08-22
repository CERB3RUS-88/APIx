import * as React from 'react';
import { cn } from '@/lib/utils';

export function TerminalSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse-subtle bg-surface-elevated/70 border border-border-subtle/40 rounded',
        className
      )}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero Skeleton */}
      <div className="p-6 bg-surface border border-border-subtle rounded space-y-4">
        <div className="flex justify-between items-center">
          <TerminalSkeleton className="h-4 w-48" />
          <TerminalSkeleton className="h-4 w-24" />
        </div>
        <TerminalSkeleton className="h-24 w-full" />
        <div className="flex gap-4">
          <TerminalSkeleton className="h-4 w-32" />
          <TerminalSkeleton className="h-4 w-32" />
          <TerminalSkeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-surface border border-border-subtle rounded space-y-2">
            <TerminalSkeleton className="h-3 w-28" />
            <TerminalSkeleton className="h-8 w-20" />
            <TerminalSkeleton className="h-2 w-full mt-2" />
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="p-6 bg-surface border border-border-subtle rounded space-y-4">
        <div className="flex justify-between items-center">
          <TerminalSkeleton className="h-5 w-64" />
          <TerminalSkeleton className="h-8 w-40" />
        </div>
        <TerminalSkeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
