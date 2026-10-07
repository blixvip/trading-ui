import type { ReactNode } from 'react';
import {
  CandleChart,
  Delta,
  DepthChart,
  NumberField,
  OrderBook,
  OrderTicket,
  Panel,
  PositionsTable,
  Price,
  Sparkline,
  Stat,
  TradeTape,
  Watchlist,
  formatCompact,
  type MarketState,
  type Position,
  type Quote,
} from '../lib';
import { CopyCommand } from './copy-command';

const REGISTRY = 'https://raw.githubusercontent.com/OWNER/trading-ui/main/r';

export interface CatalogueEntry {
  id: string;
  name: string;
  /** What it is for, in the product's own language. Not a feature list. */
  blurb: string;
  /** The one decision in it worth knowing about. */
  note?: string;
  preview: ReactNode;
  /** Preview needs the full width rather than the right-hand column. */
  wide?: boolean;
}

export function buildCatalogue(
  market: MarketState,
  quotes: Quote[],
  positions: Position[],
): CatalogueEntry[] {
  const quote = quotes[0];
  const change = quote.last - quote.prevClose;

  return [
    {
      id: 'candle-chart',
      name: 'CandleChart',
      blurb:
        'OHLC on a 2D canvas: candles, hollow candles, line or area, with a volume pane, moving averages, a crosshair and an OHLC readout.',
      note: 'Canvas, not SVG — a 240-bar chart is a thousand DOM nodes as SVG and re-layouts on every tick.',
      wide: true,
      preview: (
        <Panel title="AAPL · 1m">
          <CandleChart
            candles={market.candles}
            height={280}
            movingAverages={[{ period: 20 }, { period: 50 }]}
          />
        </Panel>
      ),
    },
    {
      id: 'order-book',
      name: 'OrderBook',
      blurb:
        'The price ladder, with a depth bar behind every level, a spread row, and markers for your own resting orders.',
      note: 'Depth bars scale across both sides — per-side scaling makes a one-sided book look balanced.',
      preview: (
        <Panel title="Order book">
          <OrderBook book={market.book} depth={7} />
        </Panel>
      ),
    },
    {
      id: 'depth-chart',
      name: 'DepthChart',
      blurb: 'Cumulative bid and ask depth mirrored around the mid.',
      note: 'Steps, never a smoothed curve: liquidity sits at discrete ticks and interpolating invents book.',
      preview: (
        <Panel title="Depth">
          <DepthChart book={market.book} height={180} />
        </Panel>
      ),
    },
    {
      id: 'trade-tape',
      name: 'TradeTape',
      blurb: 'Time and sales, newest first, with block prints called out.',
      note: 'Coloured by aggressor side, not tick direction — a print that lifted the offer is a buy even when it is lower than the last.',
      preview: (
        <Panel title="Time &amp; sales">
          <TradeTape trades={market.trades} maxRows={9} blockSize={1200} withMillis />
        </Panel>
      ),
    },
    {
      id: 'order-ticket',
      name: 'OrderTicket',
      blurb:
        'Order entry with tick-snapped prices, a size slider, a live cost estimate and an optional confirm step.',
      note: 'Blocks fat-fingers (a buy stop below the market), but only warns about legitimate risk like going short.',
      preview: (
        <Panel title="Order ticket">
          <OrderTicket
            symbol="AAPL"
            lastPrice={market.last}
            bid={market.book.bids[0]?.price}
            ask={market.book.asks[0]?.price}
            buyingPower={100_000}
            positionQuantity={400}
            feePerOrder={1}
            onSubmit={() => undefined}
          />
        </Panel>
      ),
    },
    {
      id: 'positions-table',
      name: 'PositionsTable',
      blurb: 'Open positions marked to market, with unrealised P&L and a flatten action.',
      note: 'Signed quantities, so one formula covers long and short and nothing can disagree about which way a short makes money.',
      wide: true,
      preview: (
        <Panel title="Positions">
          <PositionsTable positions={positions} onClose={() => undefined} />
        </Panel>
      ),
    },
    {
      id: 'watchlist',
      name: 'Watchlist',
      blurb: 'Symbols with price, change and an inline trend, as a real listbox.',
      preview: (
        <Panel title="Watchlist">
          <Watchlist quotes={quotes.slice(0, 6)} selected={quotes[0].symbol} />
        </Panel>
      ),
    },
    {
      id: 'sparkline',
      name: 'Sparkline',
      blurb: 'Inline SVG trend line with an area fill and an optional baseline.',
      note: 'SVG here, because a watchlist renders dozens and one canvas context per row is waste.',
      preview: (
        <Panel title="Sparkline" padded>
          <div className="flex flex-wrap items-center gap-5">
            {quotes.slice(0, 3).map((q) => (
              <Sparkline
                key={q.symbol}
                data={q.history ?? []}
                baseline={q.prevClose}
                width={120}
                height={44}
                markLast
                showBaseline
                aria-label={`${q.symbol} intraday trend`}
              />
            ))}
          </div>
        </Panel>
      ),
    },
    {
      id: 'price',
      name: 'Price · Delta · Stat',
      blurb: 'The small parts: a tabular price that flashes on tick, a change indicator, a labelled figure.',
      note: 'Delta carries direction three ways — colour, icon and sign — so it survives grayscale and colourblindness.',
      preview: (
        <Panel title="Readouts" padded>
          <div className="flex flex-wrap items-center gap-6">
            <Stat size="lg" label="Last" value={<Price value={market.last} flash emphasizeLast={2} />} />
            <Stat
              label="Day change"
              value={<Delta value={change} percent={change / quote.prevClose} />}
            />
            <Stat label="Volume" value={formatCompact(quote.volume ?? 0)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Delta pill value={1.84} percent={0.0102} />
            <Delta pill value={-3.2} percent={-0.0176} />
            <Delta pill value={0} percent={0} />
          </div>
        </Panel>
      ),
    },
    {
      id: 'number-field',
      name: 'NumberField',
      blurb: 'Numeric entry for prices and quantities, with steppers and keyboard stepping.',
      note: 'A text input with inputMode="decimal", never type="number" — a real number input changes value on scroll, and one stray scroll over a price field is a wrong order.',
      preview: (
        <Panel title="Number field" padded>
          <div className="flex flex-col gap-3">
            <NumberField label="Limit price" value={182.4} onChange={() => undefined} step={0.01} suffix="$" />
            <NumberField label="Quantity" value={100} onChange={() => undefined} step={1} />
          </div>
        </Panel>
      ),
    },
  ];
}

export function CatalogueRow({ entry }: { entry: CatalogueEntry }) {
  return (
    <article
      id={entry.id}
      className="border-site-rule grid scroll-mt-20 grid-cols-1 gap-6 border-t py-10 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-12"
    >
      <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
        <h3 className="font-mono text-[15px] font-semibold tracking-tight">{entry.name}</h3>
        <p className="text-muted-foreground max-w-[42ch] text-[13px] leading-relaxed">
          {entry.blurb}
        </p>
        {entry.note && (
          <p className="text-foreground/80 border-primary/50 max-w-[44ch] border-l pl-3 text-[12px] leading-relaxed">
            {entry.note}
          </p>
        )}
        <CopyCommand
          size="sm"
          className="mt-1 max-w-sm"
          command={`npx shadcn@latest add ${REGISTRY}/${entry.id}.json`}
          label={`shadcn add …/${entry.id}.json`}
        />
      </div>
      <div className={entry.wide ? 'lg:col-span-1' : ''}>{entry.preview}</div>
    </article>
  );
}
