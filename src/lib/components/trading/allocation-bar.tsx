'use client';

import { useMemo } from 'react';
import { formatMoney, formatPercent } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument, Position } from '../../types';
import { cn, toArray } from '../../utils';
import { EmptyState } from './empty-state';
import { EmptyPositionsArt } from './illustrations';

export interface AllocationSlice {
  symbol: string;
  /** Signed market value. Negative is a short. */
  value: number;
  /** Share of gross exposure, 0-1. */
  weight: number;
  short: boolean;
}

export interface AllocationBarProps {
  positions: Position[];
  instrument?: Partial<Instrument>;
  /** Cash sleeve, so the bar shows how much of the account is actually at work. */
  cash?: number;
  /** Names beyond this are folded into an "Other" slice. */
  maxSlices?: number;
  /** Warn above this share of gross exposure in a single name. */
  concentrationLimit?: number;
  showLegend?: boolean;
  onSelect?: (symbol: string) => void;
  className?: string;
}

/**
 * Weights by gross exposure, largest first.
 *
 * Gross, not net: a book that is long 100k and short 100k is fully deployed
 * and carries the risk of both legs, while its net is zero. Netting here would
 * report an empty portfolio for a market-neutral account.
 */
export function allocate(
  positions: readonly Position[],
  cash = 0,
  maxSlices = 8,
): AllocationSlice[] {
  const sized = positions
    .map((p) => ({ symbol: p.symbol, value: p.quantity * p.markPrice }))
    .filter((p) => Number.isFinite(p.value) && p.value !== 0);

  const gross = sized.reduce((sum, p) => sum + Math.abs(p.value), 0) + Math.max(0, cash);
  if (gross === 0) return [];

  const ranked = sized.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const head = ranked.slice(0, maxSlices);
  const tail = ranked.slice(maxSlices);

  const slices: AllocationSlice[] = head.map((p) => ({
    symbol: p.symbol,
    value: p.value,
    weight: Math.abs(p.value) / gross,
    short: p.value < 0,
  }));

  if (tail.length) {
    const value = tail.reduce((sum, p) => sum + p.value, 0);
    const weight = tail.reduce((sum, p) => sum + Math.abs(p.value), 0) / gross;
    slices.push({ symbol: `Other (${tail.length})`, value, weight, short: value < 0 });
  }

  if (cash > 0) {
    slices.push({ symbol: 'Cash', value: cash, weight: cash / gross, short: false });
  }

  return slices;
}

/**
 * Where the account actually is, as one stacked bar plus a legend.
 *
 * Concentration is the risk this exists to surface: an account can look
 * healthy on every other panel - margin fine, P&L green - while sitting in a
 * single name. A slice over `concentrationLimit` is called out by name rather
 * than left for the user to work out from the geometry.
 */
export function AllocationBar({
  positions,
  instrument,
  cash,
  maxSlices = 8,
  concentrationLimit = 0.35,
  showLegend = true,
  onSelect,
  className,
}: AllocationBarProps) {
  const inst = useInstrument(instrument);
  const rows = toArray(positions);

  const { slices, concentrated } = useMemo(() => {
    const computed = allocate(rows, cash ?? 0, maxSlices);
    return {
      slices: computed,
      concentrated: computed.filter(
        (s) => s.symbol !== 'Cash' && !s.symbol.startsWith('Other') && s.weight > concentrationLimit,
      ),
    };
  }, [rows, cash, maxSlices, concentrationLimit]);

  if (slices.length === 0) {
    return (
      <EmptyState
        className={className}
        art={<EmptyPositionsArt />}
        title="Nothing allocated"
        description="Open a position and the weight it takes up in the account shows here."
      />
    );
  }

  return (
    <div data-slot="allocation-bar" className={cn('flex flex-col gap-2.5', className)}>
      <div
        className="bg-muted flex h-3 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={slices
          .map((s) => `${s.symbol} ${formatPercent(s.weight, 1, false)}`)
          .join(', ')}
      >
        {slices.map((slice) => (
          <div
            key={slice.symbol}
            title={`${slice.symbol} — ${formatPercent(slice.weight, 1, false)}`}
            style={{ width: `${slice.weight * 100}%` }}
            className={cn(
              'h-full',
              slice.symbol === 'Cash'
                ? 'bg-muted-foreground/35'
                : slice.short
                  ? 'bg-down/70'
                  : 'bg-up/70',
              // A short slice is hatched as well as coloured, so the long/short
              // split survives greyscale and colour blindness.
              slice.short && 'bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,.35)_2px,rgba(0,0,0,.35)_4px)]',
            )}
          />
        ))}
      </div>

      {concentrated.length > 0 && (
        <p className="text-down text-[11px]">
          {concentrated.map((s) => s.symbol).join(', ')}{' '}
          {concentrated.length === 1 ? 'is' : 'are'} over{' '}
          {formatPercent(concentrationLimit, 0, false)} of gross exposure.
        </p>
      )}

      {showLegend && (
        <ul className="flex flex-col gap-1">
          {slices.map((slice) => {
            const row = (
              <>
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    aria-hidden
                    className={cn(
                      'size-2 shrink-0 rounded-[2px]',
                      slice.symbol === 'Cash'
                        ? 'bg-muted-foreground/35'
                        : slice.short
                          ? 'bg-down/70'
                          : 'bg-up/70',
                    )}
                  />
                  <span className="truncate font-medium">{slice.symbol}</span>
                  {slice.short && (
                    <span className="text-down text-[10px] font-semibold">SHORT</span>
                  )}
                </span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {formatMoney(Math.abs(slice.value), inst.currency)}
                  <span className="text-foreground ml-2 font-medium">
                    {formatPercent(slice.weight, 1, false)}
                  </span>
                </span>
              </>
            );

            return (
              <li key={slice.symbol}>
                {onSelect && slice.symbol !== 'Cash' && !slice.symbol.startsWith('Other') ? (
                  <button
                    type="button"
                    onClick={() => onSelect(slice.symbol)}
                    className="hover:bg-accent focus-visible:ring-ring flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-xs outline-none focus-visible:ring-1"
                  >
                    {row}
                  </button>
                ) : (
                  <span className="flex w-full items-center justify-between gap-2 px-1 py-0.5 text-xs">
                    {row}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
