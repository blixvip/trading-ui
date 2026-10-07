import { formatPrice, formatQuantity, formatTime } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument, Order, OrderStatus } from '../../types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

export interface OrderBlotterProps {
  orders: Order[];
  instrument?: Partial<Instrument>;
  /** Shows a cancel button on working and partially filled orders. */
  onCancel?: (order: Order) => void;
  onSelect?: (order: Order) => void;
  className?: string;
}

const STATUS_VARIANT: Record<OrderStatus, 'secondary' | 'up' | 'down' | 'flat' | 'default'> = {
  working: 'default',
  partial: 'secondary',
  filled: 'up',
  cancelled: 'flat',
  rejected: 'down',
};

/** Today's orders and their state - the audit trail beside the ticket. */
export function OrderBlotter({
  orders,
  instrument,
  onCancel,
  onSelect,
  className,
}: OrderBlotterProps) {
  const inst = useInstrument(instrument);
  const sizeDigits = inst.sizePrecision ?? 0;

  if (orders.length === 0) {
    return <div className="text-muted-foreground p-5 text-center text-xs">No orders today</div>;
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Side</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Filled</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Time</TableHead>
          {onCancel && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const live = order.status === 'working' || order.status === 'partial';
          const shown = order.limitPrice ?? order.stopPrice;
          return (
            <TableRow
              key={order.id}
              onClick={onSelect ? () => onSelect(order) : undefined}
              className={onSelect ? 'cursor-pointer' : undefined}
            >
              <TableCell>{order.symbol}</TableCell>
              <TableCell>
                <span className="flex justify-end">
                  <Badge variant={order.side === 'buy' ? 'up' : 'down'}>
                    {order.side.toUpperCase()}
                  </Badge>
                </span>
              </TableCell>
              <TableCell className="uppercase">{order.type}</TableCell>
              <TableCell>{formatQuantity(order.quantity, sizeDigits)}</TableCell>
              <TableCell>
                {shown === undefined ? 'MKT' : formatPrice(shown, inst.pricePrecision)}
              </TableCell>
              <TableCell>
                {formatQuantity(order.filledQuantity, sizeDigits)}
                {order.avgFillPrice !== undefined && (
                  <span className="opacity-70">
                    {' @ '}
                    {formatPrice(order.avgFillPrice, inst.pricePrecision)}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span className="flex justify-end">
                  <Badge variant={STATUS_VARIANT[order.status]}>
                    {order.status.toUpperCase()}
                  </Badge>
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatTime(order.time)}</TableCell>
              {onCancel && (
                <TableCell>
                  {live && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel(order);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
