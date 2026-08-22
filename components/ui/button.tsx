import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  active?: boolean;
  indicatorDot?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      active = false,
      indicatorDot = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-mono font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-signal disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer border text-xs tracking-wider uppercase';

    const variants = {
      primary:
        'bg-amber-signal text-ink hover:bg-amber-bright border-amber-signal shadow-sm font-semibold active:translate-y-[1px]',
      secondary:
        'bg-surface-elevated text-primary hover:bg-surface-hover border-border-subtle hover:border-border-active active:translate-y-[1px]',
      outline:
        'bg-transparent text-primary hover:bg-surface-elevated border-border-subtle hover:border-border-active',
      ghost:
        'bg-transparent text-secondary hover:text-primary hover:bg-surface/60 border-transparent',
      danger:
        'bg-delta-negative/10 text-delta-negative hover:bg-delta-negative/20 border-delta-negative/30',
    };

    const sizes = {
      xs: 'h-6 px-2 text-[10px] gap-1 rounded-sm',
      sm: 'h-7 px-2.5 text-[11px] gap-1.5 rounded-sm',
      md: 'h-9 px-3.5 text-xs gap-2 rounded',
      lg: 'h-10 px-4 text-xs gap-2 rounded',
    };

    const activeStyles = active
      ? 'border-amber-signal/60 bg-amber-signal/10 text-amber-signal shadow-amber-glow'
      : '';

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], activeStyles, className)}
        {...props}
      >
        {indicatorDot && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full inline-block shrink-0',
              active ? 'bg-amber-signal animate-pulse-subtle' : 'bg-secondary-muted'
            )}
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
