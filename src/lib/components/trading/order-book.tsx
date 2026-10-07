import { useMemo } from 'react';
import { formatCompact, formatPercent, formatPrice, formatQuantity } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { BookLevel, Instrument, OrderBookSnapshot } from '../../types';
import { cn } from '../../utils';

export type BookLayout = 'ladder' | 'columns';

export interface OrderBookProps {
  book: OrderBookSnapshot;
  instrument?: Partial<Instrument>;
  /** Levels shown per side. */
  depth?: number;
  /** `ladder` stacks asks over bids; `columns` sits them side by side. */
  layout?: BookLayout;
  /** Cumulative-size column. */
  showTotal?: boolean;
  /** Spread row between the two sides. */
  showSpread?: boolean;
  /** Scale depth bars by cumulative size rather than per-level size. */
  cumulativeBars?: boolean;
  /** Your own resting quantity per price, keyed by price - marks your orders. */
  myOrders?: Record<number, number>;
  /** Clicking a level. Wire it to prefilling the ticket's price. */
  onSelectLevel?: (level: BookLevel, side: 'bid' | 'ask') => void;
  className?: string;
}

interface Row extends BookLevel {
  total: number;
}

function cumulate(levels: BookLevel[], depth: number): Row[] {
  let total = 0;
  return levels.slice(0, depth).map((level) => {
    total += level.size;
    return { ...level, total };
  });
}

/**
 * Resting liquidity, with a depth bar behind every level.
 *
 * Two decisions that make or break a ladder:
 *
 * - Bars are scaled against the deepest visible level on *either* side. Scaling
 *   each side to its own maximum makes a one-sided book look balanced, which is
 *   exactly the signal a trader is looking at the ladder to find.
 * - In `ladder` layout the asks are reversed so the touch sits in the middle,
 *   the way every exchange ladder on a desk is read.
 */
export function OrderBook({
  book,
  instrument,
  depth = 10,
  layout = 'ladder',
  showTotal = true,
  showSpread = true,
  cumulativeBars = false,
  myOrders,
  onSelectLevel,
  className,
}: OrderBookProps) {
  const inst = useInstrument(instrument);
  const sizeDigits = inst.sizePrecision ?? 0;

  const { bids, asks, scale, spread, spreadPct, mid } = useMemo(() => {
    const b = cumulate(book.bids, depth);
    const a = cumulate(book.asks, depth);
    const pick = (row: Row) => (cumulativeBars ? row.total : row.size);
    const peak = Math.max(1, ...b.map(pick), ...a.map(pick));
    const bestBid = b[0]?.price ?? 0;
    const bestAsk = a[0]?.price ?? 0;
    const m = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : 0;
    return {
      bids: b,
      asks: a,
      scale: peak,
      spread: bestAsk && bestBid ? bestAsk - bestBid : 0,
      spreadPct: m ? (bestAsk - bestBid) / m : 0,
      mid: m,
    };
  }, [book, depth, cumulativeBars]);

  const gridCols = showTotal ? '1.1fr 1fr 1fr' : '1.1fr 1fr';

  const renderRow = (row: Row, side: 'bid' | 'ask') => {
    const magnitude = cumulativeBars ? row.total : row.size;
    const mine = myOrders?.[row.price];
    return (
      <button
        key={`${side}-${row.price}`}
        type="button"
        className={cn(
          'hover:bg-accent focus-visible:ring-ring relative grid w-full cursor-pointer gap-2 px-2.5 py-[3px] text-right outline-none focus-visible:ring-1 focus-visible:-ring-offset-1',
          !onSelectLevel && 'cursor-default',
        )}
        style={{ gridTemplateColumns: gridCols }}
        onClick={() => onSelectLevel?.(row, side)}
        aria-label={`${side === 'bid' ? 'Bid' : 'Ask'} ${formatPrice(row.price, inst.pricePrecision)}, size ${formatQuantity(row.size, sizeDigits)}`}
      >
        {/* Depth bar. Decoration only - the numbers already say everything. */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-px right-0 bottom-px rounded-l-sm',
            side === 'bid' ? 'bg-up-muted' : 'bg-down-muted',
          )}
          style={{ width: `${Math.min(100, (magnitude / scale) * 100)}%` }}
        />
        <span
          className={cn(
            'relative text-left font-mono font-semibold tabular-nums',
            side === 'bid' ? 'text-up' : 'text-down',
          )}
        >
          {formatPrice(row.price, inst.pricePrecision)}
        </span>
        <span className="relative font-mono tabular-nums">
          {formatQuantity(row.size, sizeDigits)}
          {mine ? (
            <span
              className="bg-primary ml-1 inline-block size-1.5 rounded-full align-middle"
              title={`Your resting order: ${formatQuantity(mine, sizeDigits)}`}
            />
          ) : null}
        </span>
        {showTotal && (
          <span className="text-muted-foreground relative font-mono tabular-nums">
            {formatCompact(row.total)}
          </span>
        )}
      </button>
    );
  };

  const header = (
    <div
      className="text-muted-foreground bg-muted grid gap-2 border-b px-2.5 py-1 text-right text-[10px] font-semibold tracking-wider uppercase"
      style={{ gridTemplateColumns: gridCols }}
    >
      <span className="text-left">Price</span>
      <span>Size</span>
      {showTotal && <span>Total</span>}
    </div>
  );

  const spreadRow = showSpread && (
    <div className="bg-muted text-muted-foreground flex items-center justify-between gap-2 border-y px-2.5 py-1.5 text-[10px]">
      <span>
        Mid{' '}
        <strong className="text-foreground font-mono text-xs tabular-nums">
          {formatPrice(mid, inst.pricePrecision)}
        </strong>
      </span>
      <span>
        Spread{' '}
        <strong className="text-foreground font-mono text-xs tabular-nums">
          {formatPrice(spread, inst.pricePrecision)}
        </strong>{' '}
        {formatPercent(spreadPct, 3, false)}
      </span>
    </div>
  );

  if (layout === 'columns') {
    return (
      <div className={cn('flex flex-col text-xs', className)}>
        <div className="grid grid-cols-2 gap-px">
          <div className="flex flex-col">
            {header}
            {bids.map((row) => renderRow(row, 'bid'))}
          </div>
          <div className="flex flex-col">
            {header}
            {asks.map((row) => renderRow(row, 'ask'))}
          </div>
        </div>
        {spreadRow}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col text-xs', className)}>
      {header}
      <div className="flex flex-col">
        {[...asks].reverse().map((row) => renderRow(row, 'ask'))}
      </div>
      {spreadRow}
      <div className="flex flex-col">{bids.map((row) => renderRow(row, 'bid'))}</div>
    </div>
  );
}
