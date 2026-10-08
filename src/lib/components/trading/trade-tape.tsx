'use client';

import { useEffect, useRef } from 'react';
import { formatPrice, formatQuantity, formatTime } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument, Trade } from '../../types';
import { cn, toArray } from '../../utils';
import { EmptyState } from './empty-state';
import { EmptyTapeArt } from './illustrations';
import { TradeTapeSkeleton } from './skeletons';

export interface TradeTapeProps {
  /** Newest first. */
  trades: Trade[];
  instrument?: Partial<Instrument>;
  maxRows?: number;
  showHeader?: boolean;
  /** Prints at or above this size are highlighted as blocks. */
  blockSize?: number;
  withMillis?: boolean;
  onSelectTrade?: (trade: Trade) => void;
  /** Shows a tape-shaped skeleton instead of the prints. */
  loading?: boolean;
  className?: string;
}

/**
 * Time and sales.
 *
 * Color is the aggressor side, not the tick direction. A print that lifted the
 * offer is a buy even when it happens to be lower than the print before it -
 * coloring by tick is the classic mistake here and it inverts the signal
 * exactly when the tape matters most.
 */
export function TradeTape({
  trades,
  instrument,
  maxRows = 30,
  showHeader = true,
  blockSize,
  withMillis = false,
  onSelectTrade,
  loading = false,
  className,
}: TradeTapeProps) {
  const inst = useInstrument(instrument);
  const sizeDigits = inst.sizePrecision ?? 0;
  const rows = toArray(trades).slice(0, maxRows);

  // Only genuinely new prints get the enter animation; without this the whole
  // tape re-animates on every parent render.
  const seen = useRef(new Set<string>());
  const firstRender = useRef(true);
  useEffect(() => {
    firstRender.current = false;
  }, []);

  const isNew = (id: string) => {
    if (firstRender.current) {
      seen.current.add(id);
      return false;
    }
    if (seen.current.has(id)) return false;
    seen.current.add(id);
    // Bound the set so a tape left running all session does not leak ids.
    if (seen.current.size > maxRows * 4) {
      seen.current = new Set(rows.map((t) => t.id));
    }
    return true;
  };

  if (loading) return <TradeTapeSkeleton rows={Math.min(maxRows, 10)} className={className} />;

  if (rows.length === 0) {
    return (
      <EmptyState
        className={className}
        art={<EmptyTapeArt />}
        title="No prints yet"
        description="Executed trades stream in here as they cross. Nothing has traded in this instrument yet."
      />
    );
  }

  return (
    <div className={cn('flex flex-col text-xs', className)}>
      {showHeader && (
        <div className="text-muted-foreground bg-muted grid grid-cols-3 gap-2 border-b px-2.5 py-1 text-right text-[10px] font-semibold tracking-wider uppercase">
          <span className="text-left">Time</span>
          <span>Price</span>
          <span>Size</span>
        </div>
      )}
      {rows.map((trade) => {
        const block = blockSize !== undefined && trade.size >= blockSize;
        return (
          <div
            key={trade.id}
            className={cn(
              'grid grid-cols-3 gap-2 px-2.5 py-[3px] text-right font-mono tabular-nums',
              isNew(trade.id) && 'animate-tape-in',
              block && 'bg-primary/10',
              onSelectTrade && 'hover:bg-accent cursor-pointer',
            )}
            onClick={onSelectTrade ? () => onSelectTrade(trade) : undefined}
          >
            <span className="text-muted-foreground text-left">
              {formatTime(trade.time, withMillis)}
            </span>
            <span className={trade.side === 'buy' ? 'text-up' : 'text-down'}>
              {formatPrice(trade.price, inst.pricePrecision)}
            </span>
            <span className={cn(block ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
              {formatQuantity(trade.size, sizeDigits)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
