'use client';

import { BellIcon, BellRingIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { formatPercent, formatPrice, roundToTick } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument } from '../../types';
import { cn } from '../../utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { EmptyState } from './empty-state';
import { EmptyWatchlistArt } from './illustrations';
import { NumberField } from './number-field';
import { SegmentedControl } from './segmented-control';

export type AlertDirection = 'above' | 'below';

export interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  direction: AlertDirection;
  /** Set once the condition has fired. */
  triggeredAt?: number;
}

export interface PriceAlertsProps {
  alerts: PriceAlert[];
  /** Current price per symbol, for the distance readout. */
  prices: Record<string, number>;
  instrument?: Partial<Instrument>;
  /** Symbol the inline composer creates alerts for. */
  symbol?: string;
  onCreate?: (alert: Omit<PriceAlert, 'id'>) => void;
  onRemove?: (alert: PriceAlert) => void;
  className?: string;
}

/**
 * Price alerts, with how far away each one is.
 *
 * The distance is the useful column, not the target: "4.80 above" tells you
 * whether this fires today or next month, which a bare target price never does.
 * Triggered alerts stay in the list rather than vanishing — an alert that fired
 * and disappeared is indistinguishable from one you never set.
 */
export function PriceAlerts({
  alerts,
  prices,
  instrument,
  symbol,
  onCreate,
  onRemove,
  className,
}: PriceAlertsProps) {
  const inst = useInstrument(instrument);
  const [draftPrice, setDraftPrice] = useState<number | null>(null);
  const [direction, setDirection] = useState<AlertDirection>('above');

  const current = symbol ? prices[symbol] : undefined;

  const submit = () => {
    if (!symbol || !draftPrice || !onCreate) return;
    onCreate({ symbol, price: roundToTick(draftPrice, inst.tickSize), direction });
    setDraftPrice(null);
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {symbol && onCreate && (
        <div className="flex items-end gap-2 border-b p-2.5">
          <SegmentedControl
            size="sm"
            aria-label="Alert direction"
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'above', label: 'Above' },
              { value: 'below', label: 'Below' },
            ]}
          />
          <NumberField
            label={`${symbol} price`}
            value={draftPrice}
            onChange={setDraftPrice}
            step={inst.tickSize}
            min={0}
            placeholder={current ? formatPrice(current, inst.pricePrecision) : '0.00'}
            className="flex-1"
          />
          <Button size="sm" disabled={!draftPrice} onClick={submit}>
            <BellIcon />
            Add
          </Button>
        </div>
      )}

      {alerts.length === 0 ? (
        <EmptyState
          size="sm"
          art={<EmptyWatchlistArt />}
          title="No alerts set"
          description="Set a level and this tells you when price reaches it."
        />
      ) : (
        <ul className="flex flex-col">
          {alerts.map((alert) => {
            const price = prices[alert.symbol];
            const distance = price !== undefined ? alert.price - price : undefined;
            const triggered = alert.triggeredAt !== undefined;
            // An alert is "reached" when price is already past the level, which
            // can be true before the feed has formally triggered it.
            const reached =
              distance !== undefined &&
              (alert.direction === 'above' ? distance <= 0 : distance >= 0);

            return (
              <li
                key={alert.id}
                className={cn(
                  'flex items-center gap-2.5 border-b px-2.5 py-2 text-xs',
                  triggered && 'bg-primary/5',
                )}
              >
                {triggered ? (
                  <BellRingIcon className="text-primary size-3.5 shrink-0" />
                ) : (
                  <BellIcon className="text-muted-foreground size-3.5 shrink-0" />
                )}

                <span className="w-14 shrink-0 font-semibold">{alert.symbol}</span>

                <span className="text-muted-foreground shrink-0">
                  {alert.direction === 'above' ? '≥' : '≤'}
                </span>
                <span className="font-mono tabular-nums">
                  {formatPrice(alert.price, inst.pricePrecision)}
                </span>

                <span className="ml-auto flex items-center gap-2">
                  {triggered ? (
                    <Badge variant="default">Triggered</Badge>
                  ) : reached ? (
                    <Badge variant="secondary">Reached</Badge>
                  ) : (
                    distance !== undefined && (
                      <span
                        className={cn(
                          'font-mono text-[11px] tabular-nums',
                          distance > 0 ? 'text-up' : 'text-down',
                        )}
                        title="Distance from the current price"
                      >
                        {distance > 0 ? '+' : ''}
                        {formatPrice(distance, inst.pricePrecision)}
                        {price ? ` · ${formatPercent(distance / price, 1)}` : ''}
                      </span>
                    )
                  )}
                  {onRemove && (
                    <Button
                      size="xs"
                      variant="ghost"
                      aria-label={`Remove alert for ${alert.symbol}`}
                      onClick={() => onRemove(alert)}
                    >
                      <XIcon />
                    </Button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
