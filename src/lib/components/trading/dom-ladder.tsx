'use client';

import { useMemo } from 'react';
import { formatQuantity, formatPrice } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument, OrderBookSnapshot, Side } from '../../types';
import { cn, toBook } from '../../utils';

export interface DomOrder {
  price: number;
  quantity: number;
  side: Side;
}

export interface DomLadderProps {
  book: OrderBookSnapshot;
  instrument?: Partial<Instrument>;
  /** Price levels rendered per side. */
  depth?: number;
  /** Last traded price, highlighted in the price column. */
  lastPrice?: number;
  /** Your working orders, drawn in the outer action columns. */
  orders?: DomOrder[];
  /** Traded volume per price for the session, shown as a centre histogram. */
  volumeAtPrice?: Record<number, number>;
  /** Click a bid/ask cell to work an order at that price. */
  onPlace?: (price: number, side: Side) => void;
  /** Click your own resting order to pull it. */
  onCancel?: (order: DomOrder) => void;
  className?: string;
}

interface Rung {
  price: number;
  bidSize: number;
  askSize: number;
  volume: number;
  myBid: number;
  myAsk: number;
}

/**
 * The depth-of-market ladder: one row per price, static price column, size on
 * either side, click to work an order.
 *
 * This is the layout a futures or equities scalper actually trades from, and it
 * differs from `OrderBook` in the way that matters: the price column does not
 * move. In a book the rows re-sort as liquidity changes and the level under
 * your cursor becomes a different price between intent and click. Here the
 * price axis is fixed, so a click lands where you aimed.
 */
export function DomLadder({
  book,
  instrument,
  depth = 10,
  lastPrice,
  orders = [],
  volumeAtPrice,
  onPlace,
  onCancel,
  className,
}: DomLadderProps) {
  const inst = useInstrument(instrument);
  const sizeDigits = inst.sizePrecision ?? 0;

  const { rungs, peakSize, peakVolume } = useMemo(() => {
    const safe = toBook(book);
    const bestBid = safe.bids[0]?.price;
    const bestAsk = safe.asks[0]?.price;
    if (bestBid === undefined || bestAsk === undefined) {
      return { rungs: [] as Rung[], peakSize: 1, peakVolume: 1 };
    }

    // Build a continuous price axis in whole ticks around the touch, rather
    // than listing only the levels that currently have size — gaps in the book
    // are information, and a ladder that closes them hides where liquidity
    // actually is not.
    const tick = inst.tickSize;
    const topTicks = Math.round(bestAsk / tick) + depth - 1;
    const bidBySize = new Map(safe.bids.map((l) => [Math.round(l.price / tick), l.size]));
    const askBySize = new Map(safe.asks.map((l) => [Math.round(l.price / tick), l.size]));
    const myBids = new Map<number, number>();
    const myAsks = new Map<number, number>();
    for (const o of orders) {
      const key = Math.round(o.price / tick);
      const target = o.side === 'buy' ? myBids : myAsks;
      target.set(key, (target.get(key) ?? 0) + o.quantity);
    }

    const out: Rung[] = [];
    let maxSize = 1;
    let maxVolume = 1;
    for (let i = 0; i < depth * 2; i++) {
      const ticks = topTicks - i;
      const price = Number((ticks * tick).toFixed(8));
      const bidSize = bidBySize.get(ticks) ?? 0;
      const askSize = askBySize.get(ticks) ?? 0;
      const volume = volumeAtPrice?.[price] ?? 0;
      maxSize = Math.max(maxSize, bidSize, askSize);
      maxVolume = Math.max(maxVolume, volume);
      out.push({
        price,
        bidSize,
        askSize,
        volume,
        myBid: myBids.get(ticks) ?? 0,
        myAsk: myAsks.get(ticks) ?? 0,
      });
    }
    return { rungs: out, peakSize: maxSize, peakVolume: maxVolume };
  }, [book, depth, inst.tickSize, orders, volumeAtPrice]);

  if (rungs.length === 0) {
    return (
      <div className="text-muted-foreground p-5 text-center text-xs">No book to ladder</div>
    );
  }

  const lastTicks = lastPrice !== undefined ? Math.round(lastPrice / inst.tickSize) : null;
  const cols = volumeAtPrice ? '46px 1fr 70px 1fr 46px' : '46px 1fr 70px 1fr 46px';

  return (
    <div className={cn('flex flex-col font-mono text-[11px] tabular-nums', className)}>
      <div
        className="text-muted-foreground bg-muted grid gap-px border-b px-1 py-1 text-center text-[9px] font-semibold tracking-wider uppercase"
        style={{ gridTemplateColumns: cols }}
      >
        <span>Mine</span>
        <span>Bid</span>
        <span>Price</span>
        <span>Ask</span>
        <span>Mine</span>
      </div>

      {rungs.map((rung) => {
        const isLast = lastTicks !== null && Math.round(rung.price / inst.tickSize) === lastTicks;
        return (
          <div
            key={rung.price}
            className={cn('grid gap-px border-b border-transparent', isLast && 'bg-primary/10')}
            style={{ gridTemplateColumns: cols }}
          >
            {/* Your working bids — click to pull. */}
            <button
              type="button"
              disabled={!rung.myBid || !onCancel}
              aria-label={rung.myBid ? `Cancel bid at ${formatPrice(rung.price, inst.pricePrecision)}` : undefined}
              onClick={() => onCancel?.({ price: rung.price, quantity: rung.myBid, side: 'buy' })}
              className={cn(
                'px-1 text-right',
                rung.myBid
                  ? 'text-up bg-up/20 hover:bg-up/35 cursor-pointer font-semibold'
                  : 'cursor-default',
              )}
            >
              {rung.myBid ? formatQuantity(rung.myBid, sizeDigits) : ''}
            </button>

            {/* Bid size — click to join. */}
            <button
              type="button"
              disabled={!onPlace}
              onClick={() => onPlace?.(rung.price, 'buy')}
              aria-label={`Bid ${formatPrice(rung.price, inst.pricePrecision)} size ${formatQuantity(rung.bidSize, sizeDigits)}`}
              className={cn(
                'relative px-1.5 text-right',
                onPlace ? 'hover:bg-up/20 cursor-pointer' : 'cursor-default',
              )}
            >
              {rung.bidSize > 0 && (
                <>
                  <span
                    aria-hidden="true"
                    className="bg-up/20 pointer-events-none absolute inset-y-px right-0"
                    style={{ width: `${(rung.bidSize / peakSize) * 100}%` }}
                  />
                  <span className="text-up relative">
                    {formatQuantity(rung.bidSize, sizeDigits)}
                  </span>
                </>
              )}
            </button>

            {/* The fixed price axis, with session volume behind it. */}
            <div className="bg-muted/60 relative px-1 text-center font-semibold">
              {rung.volume > 0 && (
                <span
                  aria-hidden="true"
                  className="bg-foreground/10 pointer-events-none absolute inset-y-px left-1/2 -translate-x-1/2"
                  style={{ width: `${(rung.volume / peakVolume) * 100}%` }}
                />
              )}
              <span className={cn('relative', isLast && 'text-primary')}>
                {formatPrice(rung.price, inst.pricePrecision)}
              </span>
            </div>

            {/* Ask size — click to join. */}
            <button
              type="button"
              disabled={!onPlace}
              onClick={() => onPlace?.(rung.price, 'sell')}
              aria-label={`Ask ${formatPrice(rung.price, inst.pricePrecision)} size ${formatQuantity(rung.askSize, sizeDigits)}`}
              className={cn(
                'relative px-1.5 text-left',
                onPlace ? 'hover:bg-down/20 cursor-pointer' : 'cursor-default',
              )}
            >
              {rung.askSize > 0 && (
                <>
                  <span
                    aria-hidden="true"
                    className="bg-down/20 pointer-events-none absolute inset-y-px left-0"
                    style={{ width: `${(rung.askSize / peakSize) * 100}%` }}
                  />
                  <span className="text-down relative">
                    {formatQuantity(rung.askSize, sizeDigits)}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!rung.myAsk || !onCancel}
              aria-label={rung.myAsk ? `Cancel offer at ${formatPrice(rung.price, inst.pricePrecision)}` : undefined}
              onClick={() => onCancel?.({ price: rung.price, quantity: rung.myAsk, side: 'sell' })}
              className={cn(
                'px-1 text-left',
                rung.myAsk
                  ? 'text-down bg-down/20 hover:bg-down/35 cursor-pointer font-semibold'
                  : 'cursor-default',
              )}
            >
              {rung.myAsk ? formatQuantity(rung.myAsk, sizeDigits) : ''}
            </button>
          </div>
        );
      })}
    </div>
  );
}
