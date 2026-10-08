'use client';

import type { ComponentProps } from 'react';
import { cn } from '../../utils';

/**
 * Loading states.
 *
 * Each skeleton is shaped like the thing it replaces - the ladder skeleton has
 * a spread row, the chart skeleton has an axis and a volume pane - so the
 * layout does not jump when real data lands and the eye already knows where to
 * look. A generic grey box would be cheaper and would cost a reflow every time.
 *
 * The pulse is opacity only, and stops under `prefers-reduced-motion`.
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-muted-foreground/15 animate-shimmer rounded-sm', className)}
      {...props}
    />
  );
}

/** Deterministic widths: random ones would re-roll on every render. */
const LADDER_WIDTHS = [62, 48, 74, 55, 68, 44, 80, 51, 66, 58, 72, 46];

export function OrderBookSkeleton({ depth = 8, className }: { depth?: number; className?: string }) {
  const row = (key: string, i: number, side: 'bid' | 'ask') => (
    <div key={key} className="flex items-center gap-2 px-2.5 py-[5px]">
      <Skeleton
        className={cn('h-2.5 flex-1', side === 'bid' ? 'bg-up/15' : 'bg-down/15')}
        style={{ maxWidth: `${LADDER_WIDTHS[i % LADDER_WIDTHS.length]}%` }}
      />
      <Skeleton className="h-2.5 w-10" />
      <Skeleton className="h-2.5 w-8" />
    </div>
  );

  return (
    <div className={cn('flex flex-col', className)} aria-hidden="true">
      <div className="bg-muted flex gap-2 border-b px-2.5 py-1.5">
        <Skeleton className="h-2 w-10" />
        <Skeleton className="ml-auto h-2 w-8" />
        <Skeleton className="h-2 w-8" />
      </div>
      {Array.from({ length: depth }, (_, i) => row(`a${i}`, i, 'ask'))}
      <div className="bg-muted my-0.5 flex items-center justify-between border-y px-2.5 py-2">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      {Array.from({ length: depth }, (_, i) => row(`b${i}`, i + 3, 'bid'))}
    </div>
  );
}

export function TradeTapeSkeleton({ rows = 10, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col', className)} aria-hidden="true">
      <div className="bg-muted flex gap-2 border-b px-2.5 py-1.5">
        <Skeleton className="h-2 w-8" />
        <Skeleton className="ml-auto h-2 w-10" />
        <Skeleton className="h-2 w-8" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-3 gap-2 px-2.5 py-[5px]">
          <Skeleton className="h-2.5 w-12" />
          <Skeleton className="h-2.5 w-12 justify-self-end" />
          <Skeleton className="h-2.5 w-8 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

/** Candle bars at varied heights around a baseline, plus axis and volume. */
const CANDLE_HEIGHTS = [38, 52, 44, 61, 49, 70, 57, 42, 66, 51, 74, 46, 59, 68, 40, 55, 63, 47];

export function CandleChartSkeleton({
  height = 320,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('flex w-full flex-col gap-2 p-2', className)}
      style={{ height }}
      aria-hidden="true"
    >
      <div className="flex min-h-0 flex-1 items-end gap-[3px] pr-14">
        {CANDLE_HEIGHTS.concat(CANDLE_HEIGHTS).map((h, i) => (
          <Skeleton
            key={i}
            className="min-w-[3px] flex-1"
            style={{ height: `${h}%`, animationDelay: `${(i % 12) * 60}ms` }}
          />
        ))}
      </div>
      <div className="flex h-[16%] items-end gap-[3px] pr-14">
        {CANDLE_HEIGHTS.concat(CANDLE_HEIGHTS).map((h, i) => (
          <Skeleton
            key={i}
            className="min-w-[3px] flex-1 opacity-60"
            style={{ height: `${h * 0.7}%`, animationDelay: `${(i % 12) * 60}ms` }}
          />
        ))}
      </div>
      <div className="flex justify-between pr-14">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-2 w-8" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 4,
  columns = 6,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col', className)} aria-hidden="true">
      <div className="bg-muted flex gap-4 border-b px-2.5 py-2">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className={cn('h-2', i === 0 ? 'w-14' : 'flex-1')} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-b px-2.5 py-2.5">
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className={cn('h-2.5', i === 0 ? 'w-14' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function WatchlistSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-2.5 border-b px-2.5 py-2">
          <Skeleton className="h-2.5 w-12" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="ml-auto h-2.5 w-12" />
          <Skeleton className="h-2.5 w-10" />
        </div>
      ))}
    </div>
  );
}
