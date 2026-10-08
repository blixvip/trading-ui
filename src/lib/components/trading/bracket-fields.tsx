import { useMemo } from 'react';
import { formatMoney, formatPercent, formatPrice, roundToTick } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument, Side } from '../../types';
import { cn } from '../../utils';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { NumberField } from './number-field';

export interface BracketValue {
  stopLoss: number | null;
  takeProfit: number | null;
}

export interface BracketFieldsProps {
  side: Side;
  entryPrice: number;
  quantity: number;
  value: BracketValue;
  onChange: (value: BracketValue) => void;
  instrument?: Partial<Instrument>;
  /** Quick stop distances as a fraction of entry, e.g. 0.01 is 1%. */
  presets?: number[];
  className?: string;
}

/**
 * Stop loss and take profit, with the risk/reward the pair actually implies.
 *
 * The R:R number is the point of the component. Traders set a stop and a
 * target separately and then never do the division, which is how a 0.4:1 trade
 * gets placed on purpose. Both legs are validated against the side: a stop
 * above entry on a long is not a stop, it is a second target.
 */
export function BracketFields({
  side,
  entryPrice,
  quantity,
  value,
  onChange,
  instrument,
  presets = [0.005, 0.01, 0.02, 0.05],
  className,
}: BracketFieldsProps) {
  const inst = useInstrument(instrument);
  const isBuy = side === 'buy';
  const { stopLoss, takeProfit } = value;

  const analysis = useMemo(() => {
    const risk =
      stopLoss !== null ? (isBuy ? entryPrice - stopLoss : stopLoss - entryPrice) : null;
    const reward =
      takeProfit !== null ? (isBuy ? takeProfit - entryPrice : entryPrice - takeProfit) : null;
    return {
      risk,
      reward,
      riskMoney: risk !== null ? risk * quantity : null,
      rewardMoney: reward !== null ? reward * quantity : null,
      ratio: risk && reward && risk > 0 ? reward / risk : null,
      stopWrongSide: risk !== null && risk <= 0,
      targetWrongSide: reward !== null && reward <= 0,
    };
  }, [stopLoss, takeProfit, entryPrice, quantity, isBuy]);

  const applyPreset = (fraction: number) => {
    const stop = isBuy ? entryPrice * (1 - fraction) : entryPrice * (1 + fraction);
    const target = isBuy ? entryPrice * (1 + fraction * 2) : entryPrice * (1 - fraction * 2);
    onChange({
      stopLoss: roundToTick(stop, inst.tickSize),
      takeProfit: roundToTick(target, inst.tickSize),
    });
  };

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex items-center justify-between">
        <Label>Bracket</Label>
        <div className="flex gap-1">
          {presets.map((p) => (
            <Button
              key={p}
              size="xs"
              variant="ghost"
              onClick={() => applyPreset(p)}
              title={`Stop ${formatPercent(p, 1, false)} away, target 2R`}
            >
              {formatPercent(p, p < 0.01 ? 1 : 0, false)}
            </Button>
          ))}
          {(stopLoss !== null || takeProfit !== null) && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onChange({ stopLoss: null, takeProfit: null })}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Stop loss"
          value={stopLoss}
          onChange={(v) =>
            onChange({ ...value, stopLoss: v === null ? null : roundToTick(v, inst.tickSize) })
          }
          step={inst.tickSize}
          min={0}
          suffix={inst.currency}
          invalid={analysis.stopWrongSide}
        />
        <NumberField
          label="Take profit"
          value={takeProfit}
          onChange={(v) =>
            onChange({ ...value, takeProfit: v === null ? null : roundToTick(v, inst.tickSize) })
          }
          step={inst.tickSize}
          min={0}
          suffix={inst.currency}
          invalid={analysis.targetWrongSide}
        />
      </div>

      {(analysis.risk !== null || analysis.reward !== null) && (
        <dl className="bg-muted flex flex-col gap-1 rounded-md border p-2.5 text-[11px]">
          {analysis.riskMoney !== null && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Risk</dt>
              <dd className={cn('font-mono tabular-nums', analysis.stopWrongSide ? 'text-destructive' : 'text-down')}>
                {analysis.stopWrongSide
                  ? `Stop must be ${isBuy ? 'below' : 'above'} ${formatPrice(entryPrice, inst.pricePrecision)}`
                  : formatMoney(Math.abs(analysis.riskMoney), inst.currency)}
              </dd>
            </div>
          )}
          {analysis.rewardMoney !== null && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Reward</dt>
              <dd className={cn('font-mono tabular-nums', analysis.targetWrongSide ? 'text-destructive' : 'text-up')}>
                {analysis.targetWrongSide
                  ? `Target must be ${isBuy ? 'above' : 'below'} ${formatPrice(entryPrice, inst.pricePrecision)}`
                  : formatMoney(Math.abs(analysis.rewardMoney), inst.currency)}
              </dd>
            </div>
          )}
          {analysis.ratio !== null && (
            <div className="flex items-center justify-between gap-3 border-t pt-1">
              <dt className="text-muted-foreground">Risk / reward</dt>
              <dd
                className={cn(
                  'font-mono font-semibold tabular-nums',
                  analysis.ratio >= 2 ? 'text-up' : analysis.ratio >= 1 ? 'text-foreground' : 'text-warn',
                )}
              >
                1 : {analysis.ratio.toFixed(2)}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

export interface LeverageSliderProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  /** Leverage at or above this is flagged. */
  warnAt?: number;
  steps?: number[];
  className?: string;
}

/**
 * Leverage selector.
 *
 * The liquidation distance is shown next to the multiplier, because "20x" is
 * an abstraction and "4.8% against you and you are out" is the actual fact
 * being chosen.
 */
export function LeverageSlider({
  value,
  onChange,
  max = 100,
  warnAt = 20,
  steps = [1, 2, 5, 10, 20, 50, 100],
  className,
}: LeverageSliderProps) {
  const liquidationDistance = value > 0 ? 1 / value : 1;
  const hot = value >= warnAt;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between">
        <Label>Leverage</Label>
        <span className="font-mono text-[11px] tabular-nums">
          <span className={cn('font-semibold', hot ? 'text-warn' : 'text-foreground')}>
            {value}×
          </span>
          <span className="text-muted-foreground">
            {' '}
            · liquidation {formatPercent(liquidationDistance, 1, false)} away
          </span>
        </span>
      </div>
      <div className="flex gap-1">
        {steps
          .filter((s) => s <= max)
          .map((step) => (
            <Button
              key={step}
              size="xs"
              variant={value === step ? 'secondary' : 'ghost'}
              aria-pressed={value === step}
              onClick={() => onChange(step)}
              className={cn('flex-1 font-mono tabular-nums', step >= warnAt && 'text-warn')}
            >
              {step}×
            </Button>
          ))}
      </div>
    </div>
  );
}
