'use client';

import { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { formatCompact, formatPrice } from '../../format';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument, Quote } from '../../types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Delta } from './delta';
import { toArray } from '../../utils';
import { EmptyState } from './empty-state';
import { EmptyWatchlistArt } from './illustrations';
import { Price } from './price';
import { Sparkline } from './sparkline';
import { TableSkeleton } from './skeletons';

export type QuoteColumn = 'last' | 'change' | 'bid' | 'ask' | 'spread' | 'high' | 'low' | 'volume' | 'trend';

export interface QuoteGridProps {
  quotes: Quote[];
  instrument?: Partial<Instrument>;
  columns?: QuoteColumn[];
  /** Click a header to sort. */
  sortable?: boolean;
  selected?: string;
  onSelect?: (quote: Quote) => void;
  loading?: boolean;
  className?: string;
}

const HEADERS: Record<QuoteColumn, string> = {
  last: 'Last',
  change: 'Change',
  bid: 'Bid',
  ask: 'Ask',
  spread: 'Spread',
  high: 'High',
  low: 'Low',
  volume: 'Volume',
  trend: 'Trend',
};

type SortKey = QuoteColumn | 'symbol';

/**
 * A dense multi-instrument quote board.
 *
 * Sorting is stable and always descending-first on numeric columns, because
 * the question is nearly always "what moved most", not "what moved least" —
 * one click should answer it rather than two.
 */
export function QuoteGrid({
  quotes,
  instrument,
  columns = ['last', 'change', 'bid', 'ask', 'volume', 'trend'],
  sortable = true,
  selected,
  onSelect,
  loading = false,
  className,
}: QuoteGridProps) {
  const inst = useInstrument(instrument);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'symbol', desc: false });

  const valueFor = (q: Quote, key: SortKey): number | string => {
    switch (key) {
      case 'symbol':
        return q.symbol;
      case 'change':
        return (q.last - q.prevClose) / q.prevClose;
      case 'spread':
        return (q.ask ?? 0) - (q.bid ?? 0);
      case 'trend':
        return q.last;
      default:
        return (q[key as keyof Quote] as number) ?? 0;
    }
  };

  const rows0 = toArray(quotes);

  const rows = useMemo(() => {
    const copy = rows0.slice();
    copy.sort((a, b) => {
      const av = valueFor(a, sort.key);
      const bv = valueFor(b, sort.key);
      const cmp =
        typeof av === 'string' || typeof bv === 'string'
          ? String(av).localeCompare(String(bv))
          : av - bv;
      return sort.desc ? -cmp : cmp;
    });
    return copy;
  }, [rows0, sort]);

  if (loading) return <TableSkeleton rows={6} columns={columns.length + 1} className={className} />;

  if (rows0.length === 0) {
    return (
      <EmptyState
        className={className}
        art={<EmptyWatchlistArt />}
        title="No instruments"
        description="Add symbols to this board and their quotes stream in here."
      />
    );
  }

  const toggle = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, desc: !prev.desc }
        : { key, desc: key !== 'symbol' },
    );

  const header = (key: SortKey, label: string) => (
    <TableHead key={key}>
      {sortable ? (
        <button
          type="button"
          onClick={() => toggle(key)}
          aria-sort={sort.key === key ? (sort.desc ? 'descending' : 'ascending') : 'none'}
          className="hover:text-foreground inline-flex cursor-pointer items-center gap-1 uppercase"
        >
          {label}
          {sort.key === key &&
            (sort.desc ? (
              <ChevronDownIcon className="size-3" />
            ) : (
              <ChevronUpIcon className="size-3" />
            ))}
        </button>
      ) : (
        label
      )}
    </TableHead>
  );

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {header('symbol', 'Symbol')}
          {columns.map((c) => header(c, HEADERS[c]))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((quote) => {
          const change = quote.last - quote.prevClose;
          return (
            <TableRow
              key={quote.symbol}
              data-state={quote.symbol === selected ? 'selected' : undefined}
              onClick={onSelect ? () => onSelect(quote) : undefined}
              className={onSelect ? 'cursor-pointer' : undefined}
            >
              <TableCell>{quote.symbol}</TableCell>
              {columns.map((column) => (
                <TableCell key={column}>
                  {column === 'last' && (
                    <Price value={quote.last} flash instrument={instrument} />
                  )}
                  {column === 'change' && (
                    <span className="flex justify-end">
                      <Delta
                        value={change}
                        percent={change / quote.prevClose}
                        precision={inst.pricePrecision}
                        icon={false}
                      />
                    </span>
                  )}
                  {column === 'bid' && (
                    <span className="text-up">
                      {quote.bid !== undefined ? formatPrice(quote.bid, inst.pricePrecision) : '--'}
                    </span>
                  )}
                  {column === 'ask' && (
                    <span className="text-down">
                      {quote.ask !== undefined ? formatPrice(quote.ask, inst.pricePrecision) : '--'}
                    </span>
                  )}
                  {column === 'spread' &&
                    (quote.bid !== undefined && quote.ask !== undefined
                      ? formatPrice(quote.ask - quote.bid, inst.pricePrecision)
                      : '--')}
                  {column === 'high' &&
                    (quote.dayHigh !== undefined
                      ? formatPrice(quote.dayHigh, inst.pricePrecision)
                      : '--')}
                  {column === 'low' &&
                    (quote.dayLow !== undefined
                      ? formatPrice(quote.dayLow, inst.pricePrecision)
                      : '--')}
                  {column === 'volume' && formatCompact(quote.volume ?? 0)}
                  {column === 'trend' && (
                    <span className="flex justify-end">
                      <Sparkline
                        data={quote.history ?? []}
                        baseline={quote.prevClose}
                        width={64}
                        height={18}
                      />
                    </span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
