import { useInstrument } from '../../theme/theme-provider';
import type { Instrument } from '../../types';
import { formatPrice } from '../../format';
import { usePriceFlash } from '../../hooks';
import { cn } from '../../utils';

export interface PriceProps {
  value: number;
  instrument?: Partial<Instrument>;
  precision?: number;
  /** Flash the cell green or red for one beat on every change. */
  flash?: boolean;
  /** Color the text by its direction against this reference (e.g. prevClose). */
  colorAgainst?: number;
  /**
   * Render the trailing N digits larger - the "big figure" convention, where
   * the handle stays quiet and the digits that actually move draw the eye.
   */
  emphasizeLast?: number;
  className?: string;
}

/** A price. Monospaced and tabular so a column of them aligns on the decimal. */
export function Price({
  value,
  instrument,
  precision,
  flash = false,
  colorAgainst,
  emphasizeLast = 0,
  className,
}: PriceProps) {
  const inst = useInstrument(instrument);
  const digits = precision ?? inst.pricePrecision;
  const flashDirection = usePriceFlash(flash ? value : 0);
  const text = formatPrice(value, digits);

  const tone =
    colorAgainst === undefined || value === colorAgainst
      ? undefined
      : value > colorAgainst
        ? 'text-up'
        : 'text-down';

  const classes = cn(
    'rounded-sm font-mono tabular-nums',
    tone,
    flash && flashDirection === 'up' && 'animate-flash-up',
    flash && flashDirection === 'down' && 'animate-flash-down',
    className,
  );

  if (emphasizeLast > 0 && emphasizeLast < text.length) {
    const split = text.length - emphasizeLast;
    return (
      <span className={classes}>
        {text.slice(0, split)}
        <span className="text-[1.2em] font-semibold">{text.slice(split)}</span>
      </span>
    );
  }

  return <span className={classes}>{text}</span>;
}
