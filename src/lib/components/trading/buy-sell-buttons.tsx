import { useInstrument } from '../../theme/theme-provider';
import { formatPrice } from '../../format';
import { usePriceFlash } from '../../hooks';
import type { Instrument, Side } from '../../types';
import { cn } from '../../utils';

export interface BuySellButtonsProps {
  bid: number;
  ask: number;
  instrument?: Partial<Instrument>;
  /** Size shown on each button, e.g. `1.00` lots or `100` shares. */
  quantity?: number;
  /** Unit label beside the quantity. */
  quantityLabel?: string;
  /** Spread block between the two sides. */
  showSpread?: boolean;
  /** Spread in ticks rather than price. */
  spreadInTicks?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  onTrade?: (side: Side, price: number) => void;
  className?: string;
}

const SIZES = {
  sm: { price: 'text-base', label: 'text-[9px]', pad: 'px-3 py-1.5' },
  default: { price: 'text-xl', label: 'text-[10px]', pad: 'px-4 py-2.5' },
  lg: { price: 'text-2xl', label: 'text-[11px]', pad: 'px-5 py-3.5' },
} as const;

/**
 * The one-click dealing buttons from an FX or CFD front end: sell at the bid on
 * the left, buy at the offer on the right, spread between them.
 *
 * Sell is on the left and buy on the right because that is the order a book is
 * drawn in, and muscle memory on a dealing desk is built on position, not on
 * reading the label. The price on each button is the price you get, which is
 * why it flashes on change rather than updating silently — a button whose value
 * changed under your cursor should say so before you click it.
 */
export function BuySellButtons({
  bid,
  ask,
  instrument,
  quantity,
  quantityLabel,
  showSpread = true,
  spreadInTicks = false,
  disabled = false,
  size = 'default',
  onTrade,
  className,
}: BuySellButtonsProps) {
  const inst = useInstrument(instrument);
  const bidFlash = usePriceFlash(bid);
  const askFlash = usePriceFlash(ask);
  const s = SIZES[size];

  const spread = ask - bid;
  const spreadText = spreadInTicks
    ? `${Math.round(spread / inst.tickSize)}`
    : formatPrice(spread, inst.pricePrecision);

  // The big figure is the part that rarely moves; the last two digits are what
  // the eye tracks, so they are the ones rendered large.
  const renderPrice = (value: number, flash: string) => {
    const text = formatPrice(value, inst.pricePrecision);
    const split = Math.max(0, text.length - 2);
    return (
      <span
        className={cn(
          'rounded-sm font-mono leading-none font-semibold tabular-nums',
          s.price,
          flash === 'up' && 'animate-flash-up',
          flash === 'down' && 'animate-flash-down',
        )}
      >
        <span className="opacity-70">{text.slice(0, split)}</span>
        {text.slice(split)}
      </span>
    );
  };

  const side = (which: Side) => {
    const isBuy = which === 'buy';
    const price = isBuy ? ask : bid;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onTrade?.(which, price)}
        aria-label={`${isBuy ? 'Buy' : 'Sell'} at ${formatPrice(price, inst.pricePrecision)}`}
        className={cn(
          'focus-visible:ring-ring flex flex-1 cursor-pointer flex-col items-center gap-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset',
          'disabled:cursor-not-allowed disabled:opacity-50',
          s.pad,
          isBuy
            ? 'bg-up/15 text-up hover:bg-up/25 active:bg-up/35'
            : 'bg-down/15 text-down hover:bg-down/25 active:bg-down/35',
        )}
      >
        <span className={cn('font-semibold tracking-[0.12em] uppercase opacity-80', s.label)}>
          {isBuy ? 'Buy' : 'Sell'}
        </span>
        {renderPrice(price, isBuy ? askFlash : bidFlash)}
        {quantity !== undefined && (
          <span className={cn('font-mono tabular-nums opacity-60', s.label)}>
            {quantity}
            {quantityLabel ? ` ${quantityLabel}` : ''}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className={cn(
        'border-border bg-card flex items-stretch overflow-hidden rounded-lg border',
        className,
      )}
    >
      {side('sell')}
      {showSpread && (
        <div className="bg-muted text-muted-foreground flex min-w-12 flex-col items-center justify-center gap-0.5 border-x px-2">
          <span className="text-[9px] tracking-wider uppercase">Spread</span>
          <span className="text-foreground font-mono text-xs font-semibold tabular-nums">
            {spreadText}
          </span>
        </div>
      )}
      {side('buy')}
    </div>
  );
}
