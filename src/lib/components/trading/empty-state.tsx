'use client';

import type { ReactNode } from 'react';
import { cn } from '../../utils';

export interface EmptyStateProps {
  /** An illustration from `illustrations.tsx`, or any drawn SVG. */
  art?: ReactNode;
  title: string;
  /** One line on why it is empty and what fills it. */
  description?: string;
  /** A single action. Omit when the user cannot do anything about it. */
  action?: ReactNode;
  size?: 'sm' | 'default';
  className?: string;
}

/**
 * The state a trading UI spends most of its life in.
 *
 * Before the open, between sessions, on a fresh account, every list here is
 * empty - so an empty state is not a corner case to apologise for, it is a
 * primary screen. Each one names what is missing and what would fill it,
 * rather than saying "no data".
 */
export function EmptyState({
  art,
  title,
  description,
  action,
  size = 'default',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        size === 'sm' ? 'px-4 py-6' : 'px-6 py-10',
        className,
      )}
    >
      {art && <div className={cn('opacity-90', size === 'sm' && 'scale-75')}>{art}</div>}
      <div className="flex max-w-[34ch] flex-col gap-1">
        <p className="text-foreground text-xs font-semibold tracking-wide">{title}</p>
        {description && (
          <p className="text-muted-foreground text-[11px] leading-relaxed">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
