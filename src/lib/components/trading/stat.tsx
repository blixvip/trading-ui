import type { ReactNode } from 'react';
import type { Direction } from '../../types';
import { cn } from '../../utils';

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  /** Small trailing element - a Delta, a unit, a badge. */
  hint?: ReactNode;
  /** Color the value by direction. */
  direction?: Direction;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VALUE_SIZE = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' } as const;

/** A labelled figure. The unit of a stat row or a KPI strip. */
export function Stat({ label, value, hint, direction, size = 'md', className }: StatProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <span className="text-muted-foreground text-[10px] font-medium tracking-wider whitespace-nowrap uppercase">
        {label}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'font-mono leading-tight font-semibold tabular-nums',
            VALUE_SIZE[size],
            direction === 'up' && 'text-up',
            direction === 'down' && 'text-down',
            direction === 'flat' && 'text-flat',
          )}
        >
          {value}
        </span>
        {hint}
      </span>
    </div>
  );
}
