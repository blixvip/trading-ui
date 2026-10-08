'use client';

import { useMemo } from 'react';
import { formatMoney, formatPercent } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument, Position } from '../../types';
import { cn } from '../../utils';
import { derivePosition } from './positions-table';

export interface ExposureBarProps {
  positions: Position[];
  instrument?: Partial<Instrument>;
  /** Cash, so the bar can show what is uninvested. */
  cash?: number;
  /** Long and short on opposing tracks instead of one stacked bar. */
  netted?: boolean;
  /** Slices below this share of gross are pooled into "Other". */
  minShare?: number;
  onSelect?: (symbol: string) => void;
  className?: string;
}

interface Slice {
  symbol: string;
  value: number;
  share: number;
  isShort: boolean;
}

/**
 * Portfolio exposure as a single stacked bar.
 *
 * Gross exposure, not net: a book that is long 1M and short 1M is flat on a net
 * reading and carrying two million dollars of risk in reality. Shorts are drawn
 * on their own track so the distinction stays visible rather than cancelling
 * out in the arithmetic.
 */
export function ExposureBar({
  positions,
  instrument,
  cash,
  netted = true,
  minShare = 0.04,
  onSelect,
  className,
}: ExposureBarProps) {
  const inst = useInstrument(instrument);

  const { longs, shorts, gross, net } = useMemo(() => {
    const rows = positions.map(derivePosition);
    const grossTotal =
      rows.reduce((sum, r) => sum + Math.abs(r.marketValue), 0) + Math.max(0, cash ?? 0);
    const netTotal = rows.reduce((sum, r) => sum + r.marketValue, 0);

    const build = (isShort: boolean): Slice[] => {
      const picked = rows
        .filter((r) => r.isShort === isShort)
        .map((r) => ({
          symbol: r.symbol,
          value: Math.abs(r.marketValue),
          share: grossTotal ? Math.abs(r.marketValue) / grossTotal : 0,
          isShort,
        }))
        .sort((a, b) => b.value - a.value);

      // Pool the tail so a long book does not render forty unlabelled slivers.
      const big = picked.filter((s) => s.share >= minShare);
      const small = picked.filter((s) => s.share < minShare);
      if (small.length > 1) {
        big.push({
          symbol: `+${small.length}`,
          value: small.reduce((sum, s) => sum + s.value, 0),
          share: small.reduce((sum, s) => sum + s.share, 0),
          isShort,
        });
      } else if (small.length === 1) {
        big.push(small[0]);
      }
      return big;
    };

    return { longs: build(false), shorts: build(true), gross: grossTotal, net: netTotal };
  }, [positions, cash, minShare]);

  if (gross === 0) {
    return <div className="text-muted-foreground p-5 text-center text-xs">No exposure</div>;
  }

  const cashShare = cash && cash > 0 ? cash / gross : 0;

  const track = (slices: Slice[], extra?: { label: string; share: number }) => (
    <div className="bg-secondary flex h-6 w-full overflow-hidden rounded-md">
      {slices.map((slice) => (
        <button
          key={slice.symbol}
          type="button"
          disabled={!onSelect}
          onClick={() => onSelect?.(slice.symbol)}
          title={`${slice.symbol} · ${formatMoney(slice.value, inst.currency)} · ${formatPercent(slice.share, 1, false)}`}
          aria-label={`${slice.symbol}, ${formatPercent(slice.share, 1, false)} of gross exposure`}
          className={cn(
            'focus-visible:ring-ring flex items-center justify-center overflow-hidden border-r border-[var(--card)] text-[10px] font-semibold whitespace-nowrap outline-none last:border-r-0 focus-visible:z-10 focus-visible:ring-2',
            slice.isShort ? 'bg-down/35 text-down-foreground' : 'bg-up/35 text-up-foreground',
            onSelect && 'cursor-pointer hover:brightness-125',
          )}
          style={{ width: `${slice.share * 100}%` }}
        >
          {slice.share > 0.07 && <span className="px-1 text-foreground">{slice.symbol}</span>}
        </button>
      ))}
      {extra && extra.share > 0 && (
        <span
          className="text-muted-foreground flex items-center justify-center text-[10px]"
          style={{ width: `${extra.share * 100}%` }}
          title={extra.label}
        >
          {extra.share > 0.07 ? extra.label : ''}
        </span>
      )}
    </div>
  );

  return (
    <div className={cn('flex flex-col gap-2.5 p-3', className)}>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-muted-foreground tracking-wider uppercase">Gross exposure</span>
        <span className="font-mono font-semibold tabular-nums">
          {formatMoney(gross, inst.currency)}
        </span>
      </div>

      {netted ? (
        <div className="flex flex-col gap-1.5">
          {longs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-up w-10 shrink-0 text-[10px] font-semibold tracking-wider uppercase">
                Long
              </span>
              {track(longs, cashShare ? { label: 'Cash', share: cashShare } : undefined)}
            </div>
          )}
          {shorts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-down w-10 shrink-0 text-[10px] font-semibold tracking-wider uppercase">
                Short
              </span>
              {track(shorts)}
            </div>
          )}
        </div>
      ) : (
        track([...longs, ...shorts], cashShare ? { label: 'Cash', share: cashShare } : undefined)
      )}

      <div className="text-muted-foreground flex items-baseline justify-between text-[11px]">
        <span>Net</span>
        <span
          className={cn(
            'font-mono font-semibold tabular-nums',
            net >= 0 ? 'text-up' : 'text-down',
          )}
        >
          {formatMoney(net, inst.currency)}
        </span>
      </div>
    </div>
  );
}
