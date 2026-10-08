'use client';

import { useMemo } from 'react';
import { formatMoney, formatPrice, formatQuantity, formatTime } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Fill, Instrument } from '../../types';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { cn, toArray } from '../../utils';
import { EmptyState } from './empty-state';
import { EmptyTapeArt } from './illustrations';
import { TableSkeleton } from './skeletons';

export interface FillsTableProps {
  fills: Fill[];
  instrument?: Partial<Instrument>;
  /** Fee column and the fee total. Off for venues that bundle fees into price. */
  showFees?: boolean;
  /** Maker/taker badge — the thing that explains why two fills cost differently. */
  showLiquidity?: boolean;
  showVenue?: boolean;
  /** Footer with filled quantity, notional, fees and the blended price. */
  showTotals?: boolean;
  onSelect?: (fill: Fill) => void;
  loading?: boolean;
  className?: string;
}

/** Quantity-weighted average price. The blended number a desk actually quotes. */
export function averageFillPrice(fills: readonly Fill[]): number {
  let qty = 0;
  let notional = 0;
  for (const fill of fills) {
    if (!Number.isFinite(fill.price) || !Number.isFinite(fill.quantity)) continue;
    qty += Math.abs(fill.quantity);
    notional += Math.abs(fill.quantity) * fill.price;
  }
  return qty === 0 ? 0 : notional / qty;
}

/**
 * Executions, not instructions.
 *
 * The blotter answers "what did I send and is it still working". This answers
 * "what did I actually get, at what blended price, and what did it cost me" —
 * and those are different questions the moment an order fills in pieces.
 *
 * The totals row is weighted by quantity rather than averaged across rows,
 * because an unweighted mean of fill prices is wrong on every partial
 * sequence and wrong in a way that looks plausible.
 */
export function FillsTable({
  fills,
  instrument,
  showFees = true,
  showLiquidity = true,
  showVenue = false,
  showTotals = true,
  onSelect,
  loading = false,
  className,
}: FillsTableProps) {
  const inst = useInstrument(instrument);
  const sizeDigits = inst.sizePrecision ?? 0;
  const rows = toArray(fills);

  const totals = useMemo(() => {
    let quantity = 0;
    let notional = 0;
    let fees = 0;
    for (const fill of rows) {
      const signed = fill.side === 'buy' ? 1 : -1;
      quantity += signed * fill.quantity;
      notional += Math.abs(fill.quantity) * fill.price;
      fees += fill.fee ?? 0;
    }
    return { quantity, notional, fees, average: averageFillPrice(rows) };
  }, [rows]);

  const columns = 4 + (showFees ? 1 : 0) + (showLiquidity ? 1 : 0) + (showVenue ? 1 : 0) + 1;

  if (loading) return <TableSkeleton rows={4} columns={columns} className={className} />;

  if (rows.length === 0) {
    return (
      <EmptyState
        className={className}
        art={<EmptyTapeArt />}
        title="No fills yet"
        description="Every execution lands here with its price, fee and whether you made or took liquidity."
      />
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Side</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Price</TableHead>
          {showFees && <TableHead>Fee</TableHead>}
          {showLiquidity && <TableHead>Liq</TableHead>}
          {showVenue && <TableHead>Venue</TableHead>}
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((fill) => (
          <TableRow
            key={fill.id}
            onClick={onSelect ? () => onSelect(fill) : undefined}
            className={onSelect ? 'cursor-pointer' : undefined}
          >
            <TableCell>{fill.symbol}</TableCell>
            <TableCell>
              <span className="flex justify-end">
                <Badge variant={fill.side === 'buy' ? 'up' : 'down'}>
                  {fill.side.toUpperCase()}
                </Badge>
              </span>
            </TableCell>
            <TableCell>{formatQuantity(fill.quantity, sizeDigits)}</TableCell>
            <TableCell className="tabular-nums">
              {formatPrice(fill.price, inst.pricePrecision)}
            </TableCell>
            {showFees && (
              <TableCell
                className={cn('tabular-nums', (fill.fee ?? 0) < 0 && 'text-up')}
                // A rebate is income, not a cost — it should not read as a fee.
                title={(fill.fee ?? 0) < 0 ? 'Maker rebate' : undefined}
              >
                {fill.fee === undefined ? '—' : formatMoney(fill.fee, inst.currency)}
              </TableCell>
            )}
            {showLiquidity && (
              <TableCell className="text-muted-foreground uppercase">
                {fill.liquidity ?? '—'}
              </TableCell>
            )}
            {showVenue && (
              <TableCell className="text-muted-foreground">{fill.venue ?? '—'}</TableCell>
            )}
            <TableCell className="text-muted-foreground">{formatTime(fill.time)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      {showTotals && (
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell />
            <TableCell className="tabular-nums">
              {formatQuantity(totals.quantity, sizeDigits)}
            </TableCell>
            <TableCell className="tabular-nums" title="Quantity-weighted average">
              {formatPrice(totals.average, inst.pricePrecision)}
            </TableCell>
            {showFees && (
              <TableCell className="tabular-nums">
                {formatMoney(totals.fees, inst.currency)}
              </TableCell>
            )}
            {showLiquidity && <TableCell />}
            {showVenue && <TableCell />}
            <TableCell className="text-muted-foreground tabular-nums">
              {formatMoney(totals.notional, inst.currency)}
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
