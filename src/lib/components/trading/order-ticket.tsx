'use client';

import { AlertTriangleIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatMoney, formatPrice, formatQuantity, roundToTick } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument, OrderDraft, OrderType, Side, TimeInForce } from '../../types';
import { cn } from '../../utils';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Slider } from '../ui/slider';
import { NumberField } from './number-field';
import { SegmentedControl } from './segmented-control';

export interface OrderTicketProps {
  symbol: string;
  instrument?: Partial<Instrument>;
  /** Used for market estimates and for the size slider. */
  lastPrice: number;
  bid?: number;
  ask?: number;
  /** Cash available. Enables the size slider and the cost check on buys. */
  buyingPower?: number;
  /** Signed existing position - lets the ticket warn before it goes short. */
  positionQuantity?: number;
  availableTypes?: readonly OrderType[];
  defaultSide?: Side;
  defaultType?: OrderType;
  defaultTimeInForce?: TimeInForce;
  /** Per-order commission, folded into the estimate. */
  feePerOrder?: number;
  /** Require a confirmation dialog before `onSubmit` fires. */
  confirm?: boolean;
  onSubmit?: (draft: OrderDraft) => void | Promise<void>;
  className?: string;
}

const TYPE_LABELS: Record<OrderType, string> = {
  market: 'Market',
  limit: 'Limit',
  stop: 'Stop',
  'stop-limit': 'Stop limit',
};

const TIF_LABELS: Record<TimeInForce, string> = {
  day: 'DAY - good for the session',
  gtc: 'GTC - good till cancelled',
  ioc: 'IOC - immediate or cancel',
  fok: 'FOK - fill or kill',
};

export interface ValidateOrderOptions {
  buyingPower?: number;
  referencePrice?: number;
  feePerOrder?: number;
  /** Signed current position, used for the short warning (not an error). */
  positionQuantity?: number;
}

/**
 * The first blocking problem with a draft, or `null` if it is submittable.
 *
 * Exported separately from the component so a host can run the same rules
 * server-side, or in its own ticket, and get identical answers.
 */
export function validateOrder(
  draft: Partial<OrderDraft>,
  options: ValidateOrderOptions = {},
): string | null {
  const { quantity, type, limitPrice, stopPrice, side } = draft;

  if (!quantity || quantity <= 0) return 'Enter a quantity.';
  if (!Number.isFinite(quantity)) return 'Quantity is not a number.';
  if ((type === 'limit' || type === 'stop-limit') && !limitPrice) return 'Enter a limit price.';
  if ((type === 'stop' || type === 'stop-limit') && !stopPrice) return 'Enter a stop price.';

  // A buy stop below the market (or a sell stop above it) triggers the instant
  // it is accepted. That is almost always a fat-finger, so block it rather
  // than quietly send a market order.
  if (type === 'stop' || type === 'stop-limit') {
    const ref = options.referencePrice;
    if (ref && stopPrice) {
      if (side === 'buy' && stopPrice <= ref) return 'Buy stop must be above the market.';
      if (side === 'sell' && stopPrice >= ref) return 'Sell stop must be below the market.';
    }
  }

  if (side === 'buy' && options.buyingPower !== undefined) {
    const price = limitPrice ?? options.referencePrice ?? 0;
    const cost = price * quantity + (options.feePerOrder ?? 0);
    if (cost > options.buyingPower) return 'Order exceeds buying power.';
  }

  return null;
}

/**
 * Order entry.
 *
 * Deliberately not a form that silently corrects you. Prices snap to the
 * instrument's tick, the estimated cost is visible before you commit, and the
 * submit button spells out side, quantity and price so the last thing you read
 * is exactly what you are about to send. Anything that would be destructive
 * but is still legitimate - going short, say - warns rather than blocks.
 */
export function OrderTicket({
  symbol,
  instrument,
  lastPrice,
  bid,
  ask,
  buyingPower,
  positionQuantity = 0,
  availableTypes = ['market', 'limit', 'stop', 'stop-limit'],
  defaultSide = 'buy',
  defaultType = 'limit',
  defaultTimeInForce = 'day',
  feePerOrder = 0,
  confirm = false,
  onSubmit,
  className,
}: OrderTicketProps) {
  const inst = useInstrument(useMemo(() => ({ symbol, ...instrument }), [symbol, instrument]));
  const [side, setSide] = useState<Side>(defaultSide);
  const [type, setType] = useState<OrderType>(defaultType);
  const [tif, setTif] = useState<TimeInForce>(defaultTimeInForce);
  const [quantity, setQuantity] = useState<number | null>(null);
  const [limitPrice, setLimitPrice] = useState<number | null>(null);
  const [stopPrice, setStopPrice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const needsLimit = type === 'limit' || type === 'stop-limit';
  const needsStop = type === 'stop' || type === 'stop-limit';

  // Reset everything when the instrument changes - carrying a quantity across
  // symbols is how people buy 400 of the wrong thing.
  useEffect(() => {
    setQuantity(null);
    setLimitPrice(null);
    setStopPrice(null);
  }, [symbol]);

  // Seed the limit price from the near touch (the side a resting order would
  // actually join), but only when it is empty - never overwrite typing.
  useEffect(() => {
    if (!needsLimit) return;
    setLimitPrice((prev) => {
      if (prev !== null) return prev;
      const seed = side === 'buy' ? (bid ?? lastPrice) : (ask ?? lastPrice);
      return roundToTick(seed, inst.tickSize);
    });
    // `bid`/`ask`/`lastPrice` are intentionally omitted: they tick constantly,
    // and re-running on every tick would fight the user's cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsLimit, side, symbol, inst.tickSize]);

  const referencePrice = useMemo(() => {
    if (type === 'market') return side === 'buy' ? (ask ?? lastPrice) : (bid ?? lastPrice);
    return limitPrice ?? lastPrice;
  }, [type, side, ask, bid, lastPrice, limitPrice]);

  const maxQuantity = useMemo(() => {
    if (side === 'sell') return Math.max(0, positionQuantity);
    if (!buyingPower || !referencePrice) return 0;
    return Math.max(0, Math.floor((buyingPower - feePerOrder) / referencePrice));
  }, [side, positionQuantity, buyingPower, referencePrice, feePerOrder]);

  const notional = (quantity ?? 0) * referencePrice;
  const total = side === 'buy' ? notional + feePerOrder : notional - feePerOrder;

  const draft: OrderDraft = {
    symbol,
    side,
    type,
    quantity: quantity ?? 0,
    limitPrice: needsLimit ? (limitPrice ?? undefined) : undefined,
    stopPrice: needsStop ? (stopPrice ?? undefined) : undefined,
    timeInForce: tif,
  };

  const error = validateOrder(draft, { buyingPower, referencePrice, feePerOrder });

  // Not an error. Shorting is legitimate; it just should never be a surprise.
  const willGoShort = side === 'sell' && (quantity ?? 0) > Math.max(0, positionQuantity);

  const send = async () => {
    if (error || !onSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(draft);
      setQuantity(null);
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  const actionLabel =
    `${side === 'buy' ? 'Buy' : 'Sell'} ${formatQuantity(quantity ?? 0, inst.sizePrecision ?? 0)} ${symbol}` +
    (needsLimit && limitPrice ? ` @ ${formatPrice(limitPrice, inst.pricePrecision)}` : '');

  return (
    <div className={cn('flex flex-col gap-3 p-3', className)}>
      <SegmentedControl
        block
        variant="direction"
        aria-label="Side"
        value={side}
        onChange={setSide}
        options={[
          { value: 'buy', label: 'BUY' },
          { value: 'sell', label: 'SELL' },
        ]}
      />

      <SegmentedControl
        block
        size="sm"
        aria-label="Order type"
        value={type}
        onChange={setType}
        options={availableTypes.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
      />

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Quantity"
          value={quantity}
          onChange={setQuantity}
          step={1}
          min={0}
          precision={inst.sizePrecision ?? 0}
          placeholder="0"
          invalid={!!error && (!quantity || quantity <= 0)}
        />
        {needsLimit ? (
          <NumberField
            label="Limit price"
            value={limitPrice}
            onChange={(v) => setLimitPrice(v === null ? null : roundToTick(v, inst.tickSize))}
            step={inst.tickSize}
            min={0}
            suffix={inst.currency}
          />
        ) : (
          <NumberField
            label="Est. price"
            value={referencePrice}
            onChange={() => undefined}
            readOnly
            hideStepper
            suffix={inst.currency}
            precision={inst.pricePrecision}
          />
        )}
      </div>

      {needsStop && (
        <NumberField
          label="Stop price"
          value={stopPrice}
          onChange={(v) => setStopPrice(v === null ? null : roundToTick(v, inst.tickSize))}
          step={inst.tickSize}
          min={0}
          suffix={inst.currency}
          invalid={!!error && error.includes('stop')}
        />
      )}

      {maxQuantity > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <Label>{side === 'buy' ? 'Of buying power' : 'Of position'}</Label>
            <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
              {Math.round(((quantity ?? 0) / maxQuantity) * 100)}%
            </span>
          </div>
          <Slider
            aria-label="Size"
            min={0}
            max={maxQuantity}
            step={1}
            value={[Math.min(quantity ?? 0, maxQuantity)]}
            onValueChange={([next]) => setQuantity(next || null)}
          />
          <div className="flex gap-1">
            {[0.25, 0.5, 0.75, 1].map((fraction) => (
              <Button
                key={fraction}
                size="xs"
                variant="ghost"
                className="flex-1"
                onClick={() => setQuantity(Math.floor(maxQuantity * fraction) || null)}
              >
                {fraction * 100}%
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label>Time in force</Label>
        <Select value={tif} onValueChange={(v) => setTif(v as TimeInForce)}>
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TIF_LABELS) as TimeInForce[]).map((key) => (
              <SelectItem key={key} value={key}>
                {TIF_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <dl className="bg-muted flex flex-col gap-1 rounded-md border p-2.5 text-xs">
        <Line label={type === 'market' ? 'Est. notional' : 'Notional'}>
          {formatMoney(notional, inst.currency)}
        </Line>
        {feePerOrder > 0 && <Line label="Fee">{formatMoney(feePerOrder, inst.currency)}</Line>}
        <Line label={side === 'buy' ? 'Est. cost' : 'Est. proceeds'}>
          {formatMoney(total, inst.currency)}
        </Line>
        {buyingPower !== undefined && (
          <Line label="Buying power">{formatMoney(buyingPower, inst.currency)}</Line>
        )}
      </dl>

      <p
        role="status"
        aria-live="polite"
        className={cn(
          'flex min-h-4 items-center gap-1 text-[10px]',
          error ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {(error || willGoShort) && <AlertTriangleIcon className="size-3 shrink-0" />}
        {error ?? (willGoShort ? 'This will open or add to a short position.' : '')}
      </p>

      <Button
        block
        size="lg"
        variant={side === 'buy' ? 'buy' : 'sell'}
        disabled={!!error || submitting || !onSubmit}
        onClick={() => (confirm ? setConfirming(true) : send())}
      >
        {submitting ? 'Sending...' : actionLabel}
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm order</DialogTitle>
            <DialogDescription>
              Review before sending. This cannot be recalled once it reaches the venue.
            </DialogDescription>
          </DialogHeader>
          <dl className="bg-muted flex flex-col gap-1 rounded-md border p-2.5 text-xs">
            <Line label="Symbol">{symbol}</Line>
            <Line label="Side">
              <span className={side === 'buy' ? 'text-up' : 'text-down'}>
                {side.toUpperCase()}
              </span>
            </Line>
            <Line label="Type">{TYPE_LABELS[type]}</Line>
            <Line label="Quantity">
              {formatQuantity(quantity ?? 0, inst.sizePrecision ?? 0)}
            </Line>
            {needsLimit && limitPrice !== null && (
              <Line label="Limit">{formatPrice(limitPrice, inst.pricePrecision)}</Line>
            )}
            {needsStop && stopPrice !== null && (
              <Line label="Stop">{formatPrice(stopPrice, inst.pricePrecision)}</Line>
            )}
            <Line label="Time in force">{tif.toUpperCase()}</Line>
            <Line label={side === 'buy' ? 'Est. cost' : 'Est. proceeds'}>
              {formatMoney(total, inst.currency)}
            </Line>
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant={side === 'buy' ? 'buy' : 'sell'} disabled={submitting} onClick={send}>
              {submitting ? 'Sending...' : `Send ${side}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground font-mono font-medium tabular-nums">{children}</dd>
    </div>
  );
}
