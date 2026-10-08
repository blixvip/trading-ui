'use client';

import type { ReactNode } from 'react';
import { formatCompact, formatPrice } from '../../format';
import { usePriceFlash } from '../../hooks';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument, Quote } from '../../types';
import { cn } from '../../utils';
import { Delta } from './delta';
import { Stat } from './stat';

export interface SymbolHeaderProps {
  quote: Quote;
  instrument?: Partial<Instrument>;
  /** Bid/ask, day range and volume. */
  showStats?: boolean;
  /** Extra controls on the right - interval pickers, watchlist toggles. */
  actions?: ReactNode;
  className?: string;
}

/** The instrument banner: who, at what price, how far it has moved today. */
export function SymbolHeader({
  quote,
  instrument,
  showStats = true,
  actions,
  className,
}: SymbolHeaderProps) {
  const inst = useInstrument(instrument);
  const flash = usePriceFlash(quote.last);
  const change = quote.last - quote.prevClose;

  return (
    <header
      className={cn(
        'bg-card flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-3.5 py-2.5 shadow-sm',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col">
        <span className="text-base leading-tight font-bold tracking-wide">{quote.symbol}</span>
        {quote.name && (
          <span className="text-muted-foreground truncate text-[10px]">{quote.name}</span>
        )}
      </div>

      <div className="flex items-baseline gap-2.5">
        <span
          className={cn(
            'rounded-sm font-mono text-2xl font-semibold tabular-nums',
            flash === 'up' && 'animate-flash-up',
            flash === 'down' && 'animate-flash-down',
          )}
        >
          {formatPrice(quote.last, inst.pricePrecision)}
        </span>
        <Delta value={change} percent={change / quote.prevClose} precision={inst.pricePrecision} />
      </div>

      {showStats && (
        <div className="ml-auto flex flex-wrap gap-5">
          {quote.bid !== undefined && (
            <Stat
              size="sm"
              label="Bid"
              value={formatPrice(quote.bid, inst.pricePrecision)}
              direction="up"
            />
          )}
          {quote.ask !== undefined && (
            <Stat
              size="sm"
              label="Ask"
              value={formatPrice(quote.ask, inst.pricePrecision)}
              direction="down"
            />
          )}
          {quote.dayLow !== undefined && quote.dayHigh !== undefined && (
            <Stat
              size="sm"
              label="Day range"
              value={`${formatPrice(quote.dayLow, inst.pricePrecision)} - ${formatPrice(quote.dayHigh, inst.pricePrecision)}`}
            />
          )}
          {quote.volume !== undefined && (
            <Stat size="sm" label="Volume" value={formatCompact(quote.volume)} />
          )}
        </div>
      )}

      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </header>
  );
}
