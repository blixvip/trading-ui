import { SearchIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPrice } from '../../format';
import type { Quote } from '../../types';
import { cn } from '../../utils';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Delta } from './delta';

export interface SymbolSearchProps {
  quotes: Quote[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (quote: Quote) => void;
  /** Shown above the results before anything is typed. */
  recent?: string[];
  placeholder?: string;
  pricePrecision?: number;
}

/**
 * Instrument search, as a command palette.
 *
 * Ranked rather than filtered alphabetically: an exact ticker match outranks a
 * prefix, which outranks a hit in the company name. Typing "A" should offer
 * AAPL before Alphabet, because on a trading desk the ticker is the name.
 */
function score(quote: Quote, query: string): number {
  const q = query.toLowerCase();
  const symbol = quote.symbol.toLowerCase();
  const name = (quote.name ?? '').toLowerCase();
  if (symbol === q) return 100;
  if (symbol.startsWith(q)) return 80 - symbol.length;
  if (name.startsWith(q)) return 60 - name.length / 10;
  if (symbol.includes(q)) return 40;
  if (name.includes(q)) return 20;
  return -1;
}

export function SymbolSearch({
  quotes,
  open,
  onOpenChange,
  onSelect,
  recent = [],
  placeholder = 'Search symbol or company…',
  pricePrecision = 2,
}: SymbolSearchProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) {
      const pinned = recent
        .map((s) => quotes.find((q) => q.symbol === s))
        .filter((q): q is Quote => !!q);
      return pinned.length ? pinned : quotes.slice(0, 8);
    }
    return quotes
      .map((q) => ({ quote: q, s: score(q, query.trim()) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 10)
      .map((r) => r.quote);
  }, [quotes, query, recent]);

  // A changing result set must never leave the highlight pointing past the end.
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const commit = (quote: Quote) => {
    onSelect(quote);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Search instruments</DialogTitle>
        <DialogDescription className="sr-only">
          Type to filter, arrow keys to move, enter to select.
        </DialogDescription>

        <div className="flex items-center gap-2.5 border-b px-3.5">
          <SearchIcon className="text-muted-foreground size-4 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Search instruments"
            aria-activedescendant={results[active] ? `sym-${results[active].symbol}` : undefined}
            className="placeholder:text-muted-foreground/70 h-12 w-full bg-transparent text-sm outline-none"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => (i + 1) % Math.max(1, results.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => (i - 1 + results.length) % Math.max(1, results.length));
              } else if (e.key === 'Enter' && results[active]) {
                e.preventDefault();
                commit(results[active]);
              }
            }}
          />
        </div>

        <div ref={listRef} role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <p className="text-muted-foreground px-3 py-6 text-center text-xs">
              Nothing matches “{query}”.
            </p>
          )}
          {results.map((quote, i) => {
            const change = quote.last - quote.prevClose;
            return (
              <button
                key={quote.symbol}
                id={`sym-${quote.symbol}`}
                data-index={i}
                role="option"
                aria-selected={i === active}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(quote)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-left',
                  i === active && 'bg-accent',
                )}
              >
                <span className="w-16 shrink-0 font-mono text-xs font-semibold">
                  {quote.symbol}
                </span>
                <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                  {quote.name}
                </span>
                <span className="font-mono text-xs tabular-nums">
                  {formatPrice(quote.last, pricePrecision)}
                </span>
                <Delta percent={change / quote.prevClose} icon={false} className="w-16 justify-end" />
              </button>
            );
          })}
        </div>

        <div className="text-muted-foreground bg-muted flex items-center gap-3 border-t px-3.5 py-2 text-[10px]">
          <Key>↑</Key>
          <Key>↓</Key>
          <span>navigate</span>
          <Key>↵</Key>
          <span>select</span>
          <Key>esc</Key>
          <span>close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="border-border bg-card text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
      {children}
    </kbd>
  );
}
