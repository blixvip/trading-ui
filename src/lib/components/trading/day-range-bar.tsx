'use client';

import { formatPrice } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument } from '../../types';
import { cn } from '../../utils';

export interface DayRangeBarProps {
  low: number;
  high: number;
  last: number;
  instrument?: Partial<Instrument>;
  /** A second, wider range drawn behind — typically the 52-week range. */
  outerLow?: number;
  outerHigh?: number;
  outerLabel?: string;
  /** Previous close, marked on the track. */
  previousClose?: number;
  showLabels?: boolean;
  className?: string;
}

/**
 * Where the current price sits inside its range.
 *
 * Two ranges on one track when an outer range is given, because "near the high"
 * means something different on the day than on the year, and reading them from
 * two separate widgets loses the relationship between them.
 */
export function DayRangeBar({
  low,
  high,
  last,
  instrument,
  outerLow,
  outerHigh,
  outerLabel = '52w',
  previousClose,
  showLabels = true,
  className,
}: DayRangeBarProps) {
  const inst = useInstrument(instrument);
  const hasOuter = outerLow !== undefined && outerHigh !== undefined && outerHigh > outerLow;

  // Everything is positioned against the widest range on the track, so the
  // inner range reads as a segment of the outer rather than a separate scale.
  const min = hasOuter ? Math.min(outerLow!, low) : low;
  const max = hasOuter ? Math.max(outerHigh!, high) : high;
  const span = max - min || 1;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - min) / span) * 100));

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {showLabels && (
        <div className="text-muted-foreground flex items-baseline justify-between font-mono text-[10px] tabular-nums">
          <span>{formatPrice(min, inst.pricePrecision)}</span>
          {hasOuter && (
            <span className="text-[9px] tracking-wider uppercase">{outerLabel} range</span>
          )}
          <span>{formatPrice(max, inst.pricePrecision)}</span>
        </div>
      )}

      <div
        className="bg-secondary relative h-1.5 w-full rounded-full"
        role="meter"
        aria-valuenow={last}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={`Price ${formatPrice(last, inst.pricePrecision)} within ${formatPrice(min, inst.pricePrecision)} to ${formatPrice(max, inst.pricePrecision)}`}
      >
        {/* The day's range, as a lit segment of the wider track. */}
        <span
          aria-hidden="true"
          className="bg-muted-foreground/45 absolute inset-y-0 rounded-full"
          style={{ left: `${pos(low)}%`, width: `${Math.max(1, pos(high) - pos(low))}%` }}
        />

        {previousClose !== undefined && (
          <span
            aria-hidden="true"
            className="bg-muted-foreground absolute -inset-y-1 w-px opacity-70"
            style={{ left: `${pos(previousClose)}%` }}
            title={`Previous close ${formatPrice(previousClose, inst.pricePrecision)}`}
          />
        )}

        <span
          aria-hidden="true"
          className={cn(
            'border-card absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2',
            previousClose !== undefined && last < previousClose ? 'bg-down' : 'bg-up',
          )}
          style={{ left: `${pos(last)}%` }}
        />
      </div>

      {showLabels && (
        <div className="flex items-baseline justify-between font-mono text-[10px] tabular-nums">
          <span className="text-muted-foreground">
            Day {formatPrice(low, inst.pricePrecision)}
          </span>
          <span className="text-foreground font-semibold">
            {formatPrice(last, inst.pricePrecision)}
          </span>
          <span className="text-muted-foreground">{formatPrice(high, inst.pricePrecision)}</span>
        </div>
      )}
    </div>
  );
}
