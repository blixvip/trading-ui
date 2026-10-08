import { useState } from 'react';
import { formatQuantity } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument, Side } from '../../types';
import { cn } from '../../utils';
import { Button } from '../ui/button';
import { NumberField } from './number-field';

export interface QuickTradeBarProps {
  instrument?: Partial<Instrument>;
  /** Preset sizes offered as chips. */
  presets?: number[];
  defaultQuantity?: number;
  /** Signed current position — enables Flatten and Reverse. */
  positionQuantity?: number;
  disabled?: boolean;
  onTrade?: (side: Side, quantity: number) => void;
  onFlatten?: () => void;
  onReverse?: () => void;
  className?: string;
}

/**
 * One-click dealing with preset sizes, for the trader who already knows what
 * they want and is only choosing how much.
 *
 * Flatten and Reverse are deliberately separated from Buy and Sell by a rule
 * and only enabled when a position exists: they act on everything you hold, and
 * sitting them next to a size chip is how someone closes a book by accident.
 */
export function QuickTradeBar({
  instrument,
  presets = [10, 25, 50, 100],
  defaultQuantity,
  positionQuantity = 0,
  disabled = false,
  onTrade,
  onFlatten,
  onReverse,
  className,
}: QuickTradeBarProps) {
  const inst = useInstrument(instrument);
  const [quantity, setQuantity] = useState<number | null>(defaultQuantity ?? presets[0] ?? null);
  const flat = positionQuantity === 0;
  const canTrade = !disabled && !!quantity && quantity > 0;

  return (
    <div className={cn('flex flex-wrap items-end gap-2 p-2.5', className)}>
      <NumberField
        label="Size"
        value={quantity}
        onChange={setQuantity}
        step={1}
        min={0}
        precision={inst.sizePrecision ?? 0}
        className="w-28"
      />

      <div className="flex gap-1" role="group" aria-label="Preset sizes">
        {presets.map((preset) => (
          <Button
            key={preset}
            size="sm"
            variant={quantity === preset ? 'secondary' : 'ghost'}
            aria-pressed={quantity === preset}
            disabled={disabled}
            onClick={() => setQuantity(preset)}
            className="font-mono tabular-nums"
          >
            {formatQuantity(preset, inst.sizePrecision ?? 0)}
          </Button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <Button
          variant="buy"
          disabled={!canTrade}
          onClick={() => onTrade?.('buy', quantity!)}
          className="min-w-20"
        >
          Buy
        </Button>
        <Button
          variant="sell"
          disabled={!canTrade}
          onClick={() => onTrade?.('sell', quantity!)}
          className="min-w-20"
        >
          Sell
        </Button>
      </div>

      {(onFlatten || onReverse) && (
        <div className="ml-auto flex items-center gap-1.5 border-l pl-2.5">
          {onFlatten && (
            <Button size="sm" variant="outline" disabled={flat || disabled} onClick={onFlatten}>
              Flatten
            </Button>
          )}
          {onReverse && (
            <Button size="sm" variant="outline" disabled={flat || disabled} onClick={onReverse}>
              Reverse
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
