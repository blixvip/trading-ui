import { useMemo } from 'react';
import {
  directionOf,
  formatMoney,
  formatPercent,
  formatPrice,
  formatQuantity,
} from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument, Position } from '../../types';
import { cn } from '../../utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Delta } from './delta';

export interface PositionRow extends Position {
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPct: number;
  isShort: boolean;
}

export interface PositionsTableProps {
  positions: Position[];
  instrument?: Partial<Instrument>;
  showTotals?: boolean;
  onSelect?: (position: Position) => void;
  /** Adds a flatten button per row. */
  onClose?: (position: Position) => void;
  className?: string;
}

/**
 * Derives market value and P&L from a signed quantity.
 *
 * Signed rather than a separate side field, because then one formula covers
 * both directions: a short's mark falling produces a positive P&L with no
 * special case, and no code path can disagree about which way a short makes
 * money.
 */
export function derivePosition(position: Position): PositionRow {
  const { quantity, avgPrice, markPrice } = position;
  const marketValue = quantity * markPrice;
  const unrealizedPnl = (markPrice - avgPrice) * quantity;
  const cost = Math.abs(quantity * avgPrice);
  return {
    ...position,
    marketValue,
    unrealizedPnl,
    unrealizedPct: cost ? unrealizedPnl / cost : 0,
    isShort: quantity < 0,
  };
}

/** Open positions, marked to market. */
export function PositionsTable({
  positions,
  instrument,
  showTotals = true,
  onSelect,
  onClose,
  className,
}: PositionsTableProps) {
  const inst = useInstrument(instrument);
  const rows = useMemo(() => positions.map(derivePosition), [positions]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc.marketValue += row.marketValue;
          acc.unrealizedPnl += row.unrealizedPnl;
          acc.cost += Math.abs(row.quantity * row.avgPrice);
          return acc;
        },
        { marketValue: 0, unrealizedPnl: 0, cost: 0 },
      ),
    [rows],
  );

  if (rows.length === 0) {
    return <div className="text-muted-foreground p-5 text-center text-xs">No open positions</div>;
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Avg</TableHead>
          <TableHead>Mark</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Unrealized</TableHead>
          {onClose && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.symbol}
            onClick={onSelect ? () => onSelect(row) : undefined}
            className={onSelect ? 'cursor-pointer' : undefined}
          >
            <TableCell>
              <span className="flex items-center gap-1.5">
                {row.symbol}
                <Badge variant={row.isShort ? 'down' : 'up'}>
                  {row.isShort ? 'SHORT' : 'LONG'}
                </Badge>
              </span>
            </TableCell>
            <TableCell>{formatQuantity(Math.abs(row.quantity), inst.sizePrecision ?? 0)}</TableCell>
            <TableCell>{formatPrice(row.avgPrice, inst.pricePrecision)}</TableCell>
            <TableCell>{formatPrice(row.markPrice, inst.pricePrecision)}</TableCell>
            <TableCell>{formatMoney(row.marketValue, inst.currency)}</TableCell>
            <TableCell
              className={cn(
                directionOf(row.unrealizedPnl) === 'up' && 'text-up',
                directionOf(row.unrealizedPnl) === 'down' && 'text-down',
              )}
            >
              {formatMoney(row.unrealizedPnl, inst.currency)}{' '}
              <span className="opacity-70">{formatPercent(row.unrealizedPct)}</span>
            </TableCell>
            {onClose && (
              <TableCell>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(row);
                  }}
                >
                  Flatten
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
      {showTotals && (
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell>{formatMoney(totals.marketValue, inst.currency)}</TableCell>
            <TableCell>
              <span className="flex justify-end">
                <Delta
                  value={totals.unrealizedPnl}
                  percent={totals.cost ? totals.unrealizedPnl / totals.cost : 0}
                  icon={false}
                />
              </span>
            </TableCell>
            {onClose && <TableCell />}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
