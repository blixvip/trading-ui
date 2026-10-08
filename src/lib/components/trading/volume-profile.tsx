import { useMemo } from 'react';
import { formatCompact, formatPrice } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Candle, Instrument } from '../../types';
import { cn } from '../../utils';

export interface VolumeProfileProps {
  candles: Candle[];
  instrument?: Partial<Instrument>;
  /** Price buckets to split the range into. */
  buckets?: number;
  height?: number;
  /** Mark the point of control — the price that traded the most. */
  showPoc?: boolean;
  /** Shade the value area (the central share of volume). */
  valueAreaPercent?: number;
  className?: string;
}

interface Bucket {
  low: number;
  high: number;
  mid: number;
  volume: number;
  inValueArea: boolean;
  isPoc: boolean;
}

/**
 * Volume at price: a horizontal histogram of how much traded at each level.
 *
 * Each bar's volume is spread across the buckets the candle's range actually
 * covers, rather than dumped entirely at its close. Attributing a whole bar to
 * one price is the common shortcut and it invents a spike that never traded.
 *
 * SVG rather than canvas: a profile is tens of bars, not thousands, and it
 * needs to line up exactly with a price axis beside it.
 */
export function VolumeProfile({
  candles,
  instrument,
  buckets = 24,
  height = 280,
  showPoc = true,
  valueAreaPercent = 0.7,
  className,
}: VolumeProfileProps) {
  const inst = useInstrument(instrument);

  const model = useMemo(() => {
    if (candles.length === 0) return null;

    let lo = Infinity;
    let hi = -Infinity;
    for (const c of candles) {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
    }
    if (!Number.isFinite(lo) || hi <= lo) return null;

    const step = (hi - lo) / buckets;
    const rows: Bucket[] = Array.from({ length: buckets }, (_, i) => ({
      low: lo + i * step,
      high: lo + (i + 1) * step,
      mid: lo + (i + 0.5) * step,
      volume: 0,
      inValueArea: false,
      isPoc: false,
    }));

    for (const candle of candles) {
      const first = Math.max(0, Math.floor((candle.low - lo) / step));
      const last = Math.min(buckets - 1, Math.floor((candle.high - lo) / step));
      const span = last - first + 1;
      const share = candle.volume / span;
      for (let i = first; i <= last; i++) rows[i].volume += share;
    }

    const peak = Math.max(...rows.map((r) => r.volume), 1);
    const pocIndex = rows.reduce((best, r, i) => (r.volume > rows[best].volume ? i : best), 0);
    rows[pocIndex].isPoc = true;

    // Value area: grow outward from the POC, always taking the heavier
    // neighbour, until the target share of total volume is enclosed.
    const total = rows.reduce((sum, r) => sum + r.volume, 0);
    const target = total * valueAreaPercent;
    let covered = rows[pocIndex].volume;
    let low = pocIndex;
    let high = pocIndex;
    while (covered < target && (low > 0 || high < buckets - 1)) {
      const below = low > 0 ? rows[low - 1].volume : -1;
      const above = high < buckets - 1 ? rows[high + 1].volume : -1;
      if (above >= below) {
        high += 1;
        covered += rows[high].volume;
      } else {
        low -= 1;
        covered += rows[low].volume;
      }
    }
    for (let i = low; i <= high; i++) rows[i].inValueArea = true;

    return { rows: rows.reverse(), peak, lo, hi };
  }, [candles, buckets, valueAreaPercent]);

  if (!model) {
    return (
      <div className="text-muted-foreground p-5 text-center text-xs">No volume to profile</div>
    );
  }

  const rowHeight = height / model.rows.length;

  return (
    <div
      className={cn('flex w-full flex-col font-mono text-[10px] tabular-nums', className)}
      style={{ height }}
      role="img"
      aria-label={`Volume profile across ${formatPrice(model.lo, inst.pricePrecision)} to ${formatPrice(model.hi, inst.pricePrecision)}`}
    >
      {model.rows.map((row) => (
        <div
          key={row.mid}
          className="relative flex items-center gap-1 pr-1"
          style={{ height: rowHeight }}
          title={`${formatPrice(row.mid, inst.pricePrecision)} · ${formatCompact(row.volume)}`}
        >
          <span
            aria-hidden="true"
            className={cn(
              'h-[calc(100%-1px)] rounded-r-[2px]',
              row.isPoc && showPoc
                ? 'bg-primary'
                : row.inValueArea
                  ? 'bg-muted-foreground/45'
                  : 'bg-muted-foreground/20',
            )}
            style={{ width: `${Math.max(1, (row.volume / model.peak) * 78)}%` }}
          />
          {/* Sits directly against the end of its own bar, not flushed to the
              edge — a label floating in empty space reads as belonging to the
              axis rather than to the level it names. */}
          {row.isPoc && showPoc && (
            <span className="text-primary shrink-0 font-semibold">
              {formatPrice(row.mid, inst.pricePrecision)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
