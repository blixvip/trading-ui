import { formatPrice } from '../../format';
import { useReducedMotion } from '../../hooks';
import type { Quote } from '../../types';
import { cn } from '../../utils';
import { Delta } from './delta';

export interface TickerTapeProps {
  quotes: Quote[];
  /** Seconds for one full pass. Higher is slower. */
  duration?: number;
  pricePrecision?: number;
  onSelect?: (quote: Quote) => void;
  className?: string;
}

/**
 * Scrolling quote strip for the top of a terminal.
 *
 * The track holds two copies of the list and translates by -50%, which makes
 * the loop seamless without measuring anything. Hover or keyboard focus pauses
 * it, so a moving target is still clickable, and under
 * `prefers-reduced-motion` it does not scroll at all - it becomes an ordinary
 * horizontally scrollable strip.
 */
export function TickerTape({
  quotes,
  duration = 60,
  pricePrecision = 2,
  onSelect,
  className,
}: TickerTapeProps) {
  const reducedMotion = useReducedMotion();

  if (quotes.length === 0) return null;

  const items = reducedMotion ? quotes : [...quotes, ...quotes];

  return (
    <div
      className={cn(
        'bg-card flex overflow-hidden rounded-xl border shadow-sm',
        reducedMotion && 'overflow-x-auto',
        !reducedMotion &&
          '[mask-image:linear-gradient(90deg,transparent,#000_40px,#000_calc(100%-40px),transparent)]',
        className,
      )}
    >
      <div
        className={cn(
          'flex shrink-0',
          !reducedMotion &&
            'animate-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]',
        )}
        style={reducedMotion ? undefined : { animationDuration: `${duration}s` }}
      >
        {items.map((quote, i) => {
          const change = quote.last - quote.prevClose;
          const duplicate = i >= quotes.length;
          return (
            <button
              key={`${quote.symbol}-${i}`}
              type="button"
              // The second copy is a visual duplicate: keep it out of the
              // accessibility tree and out of the tab order.
              aria-hidden={duplicate}
              tabIndex={duplicate ? -1 : 0}
              className="hover:bg-accent focus-visible:ring-ring flex cursor-pointer items-baseline gap-2 border-r px-4 py-2 whitespace-nowrap outline-none focus-visible:ring-2"
              onClick={() => onSelect?.(quote)}
            >
              <span className="text-xs font-bold tracking-wide">{quote.symbol}</span>
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {formatPrice(quote.last, pricePrecision)}
              </span>
              <Delta percent={change / quote.prevClose} icon={false} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
