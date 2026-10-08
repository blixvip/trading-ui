'use client';

import { directionOf, formatMoney, formatPercent } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument } from '../../types';
import { cn } from '../../utils';
import { Delta } from './delta';
import { Stat } from './stat';

export interface Account {
  equity: number;
  /** Cash available to open new positions. */
  buyingPower: number;
  /** Equity at the previous close, for the day figure. */
  previousEquity?: number;
  cash?: number;
  /** Margin currently posted. */
  marginUsed?: number;
  /** Total margin the account is allowed. */
  marginAvailable?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
}

export interface AccountSummaryProps {
  account: Account;
  instrument?: Partial<Instrument>;
  /** Stacked for a sidebar, inline for a header strip. */
  layout?: 'grid' | 'inline';
  className?: string;
}

/** Account health at a glance: equity, day P&L, buying power, margin. */
export function AccountSummary({
  account,
  instrument,
  layout = 'grid',
  className,
}: AccountSummaryProps) {
  const inst = useInstrument(instrument);
  const {
    equity,
    buyingPower,
    previousEquity,
    cash,
    marginUsed,
    marginAvailable,
    realizedPnl,
    unrealizedPnl,
  } = account;

  const dayPnl = previousEquity !== undefined ? equity - previousEquity : undefined;
  const dayPct = previousEquity ? dayPnl! / previousEquity : undefined;
  const marginPct =
    marginUsed !== undefined && marginAvailable ? marginUsed / marginAvailable : undefined;

  return (
    <div
      className={cn(
        layout === 'grid'
          ? 'grid grid-cols-2 gap-x-6 gap-y-4 p-3'
          : 'flex flex-wrap items-center gap-x-8 gap-y-3 p-3',
        className,
      )}
    >
      <Stat
        size="lg"
        label="Equity"
        value={formatMoney(equity, inst.currency)}
        hint={
          dayPnl !== undefined ? <Delta value={dayPnl} percent={dayPct} icon={false} /> : undefined
        }
      />
      <Stat label="Buying power" value={formatMoney(buyingPower, inst.currency)} />

      {unrealizedPnl !== undefined && (
        <Stat
          label="Unrealized"
          value={formatMoney(unrealizedPnl, inst.currency)}
          direction={directionOf(unrealizedPnl)}
        />
      )}
      {realizedPnl !== undefined && (
        <Stat
          label="Realized"
          value={formatMoney(realizedPnl, inst.currency)}
          direction={directionOf(realizedPnl)}
        />
      )}
      {cash !== undefined && <Stat label="Cash" value={formatMoney(cash, inst.currency)} />}

      {marginPct !== undefined && (
        <div className="col-span-2 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Margin used
            </span>
            <span className="font-mono text-[11px] tabular-nums">
              {formatMoney(marginUsed!, inst.currency)}{' '}
              <span className="text-muted-foreground">
                / {formatMoney(marginAvailable!, inst.currency)}
              </span>
            </span>
          </div>
          <MarginBar value={marginPct} />
        </div>
      )}
    </div>
  );
}

export interface MarginBarProps {
  /** Utilisation as a ratio of the limit. */
  value: number;
  /** Utilisation above this is a warning. */
  warnAt?: number;
  /** Utilisation above this is a danger. */
  dangerAt?: number;
  className?: string;
}

/**
 * Margin utilisation.
 *
 * Banded rather than a smooth gradient, and the thresholds are marked on the
 * track: the number that matters is not "how full" but "how close to the level
 * where you get called", and a gradient hides exactly that boundary.
 */
export function MarginBar({ value, warnAt = 0.6, dangerAt = 0.85, className }: MarginBarProps) {
  const pct = Math.max(0, Math.min(1, value));
  const tone = pct >= dangerAt ? 'bg-down' : pct >= warnAt ? 'bg-warn' : 'bg-up';

  return (
    <div
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full', 'bg-secondary', className)}
      role="meter"
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Margin utilisation"
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', tone)}
        style={{ width: `${pct * 100}%` }}
      />
      {[warnAt, dangerAt].map((mark) => (
        <span
          key={mark}
          aria-hidden="true"
          className="bg-background/80 absolute inset-y-0 w-px"
          style={{ left: `${mark * 100}%` }}
        />
      ))}
    </div>
  );
}

export interface RiskMeterProps {
  /** 0–1. Anything you want scored: margin, concentration, leverage. */
  value: number;
  label?: string;
  warnAt?: number;
  dangerAt?: number;
  className?: string;
}

/** A labelled risk reading with its level named, not only coloured. */
export function RiskMeter({
  value,
  label = 'Risk',
  warnAt = 0.6,
  dangerAt = 0.85,
  className,
}: RiskMeterProps) {
  const pct = Math.max(0, Math.min(1, value));
  const level = pct >= dangerAt ? 'High' : pct >= warnAt ? 'Elevated' : 'Normal';
  const tone = pct >= dangerAt ? 'text-down' : pct >= warnAt ? 'text-foreground' : 'text-up';

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {label}
        </span>
        <span className={cn('font-mono text-[11px] font-semibold tabular-nums', tone)}>
          {formatPercent(pct, 0, false)} · {level}
        </span>
      </div>
      <MarginBar value={pct} warnAt={warnAt} dangerAt={dangerAt} />
    </div>
  );
}
