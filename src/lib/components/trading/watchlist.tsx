import { formatPrice } from '../../format';
import type { Quote } from '../../types';
import { cn } from '../../utils';
import { Delta } from './delta';
import { Sparkline } from './sparkline';

export interface WatchlistProps {
  quotes: Quote[];
  /** Symbol to mark as current. */
  selected?: string;
  onSelect?: (quote: Quote) => void;
  pricePrecision?: number;
  showSparkline?: boolean;
  /** Absolute change instead of percent. */
  showAbsolute?: boolean;
  className?: string;
}

/**
 * Symbol list with price, change and an inline trend.
 *
 * Rows are real buttons in a listbox, not clickable divs: the list is tabbable,
 * the current row is announced via `aria-selected`, and the sparkline is hidden
 * from assistive tech because the number beside it already says the same thing.
 */
export function Watchlist({
  quotes,
  selected,
  onSelect,
  pricePrecision = 2,
  showSparkline = true,
  showAbsolute = false,
  className,
}: WatchlistProps) {
  if (quotes.length === 0) {
    return <div className="text-muted-foreground p-5 text-center text-xs">Watchlist is empty</div>;
  }

  return (
    <div
      role="listbox"
      aria-label="Watchlist"
      className={cn('flex flex-col', className)}
    >
      {quotes.map((quote) => {
        const change = quote.last - quote.prevClose;
        const isSelected = quote.symbol === selected;
        return (
          <button
            key={quote.symbol}
            type="button"
            role="option"
            aria-selected={isSelected}
            className={cn(
              'hover:bg-accent focus-visible:ring-ring grid w-full cursor-pointer grid-cols-[minmax(52px,1fr)_58px_minmax(60px,auto)_minmax(66px,auto)] items-center gap-2.5 border-b px-2.5 py-1.5 text-left outline-none focus-visible:ring-2',
              isSelected && 'bg-primary/10 shadow-[inset_2px_0_0_var(--primary)]',
            )}
            onClick={() => onSelect?.(quote)}
          >
            <span className="text-xs font-semibold tracking-wide">{quote.symbol}</span>
            {showSparkline ? (
              <Sparkline
                data={quote.history ?? []}
                baseline={quote.prevClose}
                width={58}
                height={20}
              />
            ) : (
              <span />
            )}
            <span className="text-right font-mono text-xs tabular-nums">
              {formatPrice(quote.last, pricePrecision)}
            </span>
            <span className="flex justify-end">
              <Delta
                value={showAbsolute ? change : undefined}
                percent={showAbsolute ? undefined : change / quote.prevClose}
                precision={pricePrecision}
                icon={false}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
