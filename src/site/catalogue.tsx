import type { ReactNode } from 'react';
import {
  AccountSummary,
  BracketFields,
  BuySellButtons,
  CandleChart,
  ConnectionStatus,
  DayRangeBar,
  Delta,
  DepthChart,
  DomLadder,
  AllocationBar,
  ExposureBar,
  FillsTable,
  IndicatorPane,
  IntervalPicker,
  LeverageSlider,
  MarketHeatmap,
  NumberField,
  OrderBook,
  OrderTicket,
  Panel,
  PnlChart,
  PositionsTable,
  Price,
  PriceAlerts,
  QuickTradeBar,
  QuoteGrid,
  RiskMeter,
  SessionClock,
  Sparkline,
  Stat,
  TimeRangePicker,
  TradeTape,
  VolumeProfile,
  generateFills,
  Watchlist,
  formatCompact,
  generateEquityCurve,
  generateVolumeAtPrice,
  quotesToHeatmap,
  type MarketState,
  type Position,
  type Quote,
} from '../lib';
import { CopyCommand } from './copy-command';

const REGISTRY = 'https://raw.githubusercontent.com/blixvip/trading-ui/main/r';

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
  const fills = generateFills({ symbol: quote.symbol, mid: quote.last, count: 10 });

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

    // --- dealing ---
    {
      id: 'buy-sell-buttons',
      name: 'BuySellButtons',
      blurb:
        'One-click dealing: sell at the bid, buy at the offer, spread between them. The price on the button flashes when it moves.',
      note: 'Sell left, buy right — the order a book is drawn in, because muscle memory on a desk is built on position, not on reading the label.',
      preview: (
        <Panel title="Deal" padded>
          <BuySellButtons
            bid={market.book.bids[0].price}
            ask={market.book.asks[0].price}
            quantity={100}
            quantityLabel="sh"
            size="lg"
          />
        </Panel>
      ),
    },
    {
      id: 'quick-trade-bar',
      name: 'QuickTradeBar',
      blurb: 'Preset sizes with buy, sell, flatten and reverse.',
      note: 'Flatten and Reverse sit behind a rule and only light up when a position exists — they act on everything you hold.',
      wide: true,
      preview: (
        <Panel title="Quick trade">
          <QuickTradeBar
            positionQuantity={400}
            onTrade={() => undefined}
            onFlatten={() => undefined}
            onReverse={() => undefined}
          />
        </Panel>
      ),
    },

    // --- advanced market data ---
    {
      id: 'dom-ladder',
      name: 'DomLadder',
      blurb:
        'Depth of market on a fixed price axis: click a size cell to work an order, click your own to pull it.',
      note: 'The price column does not re-sort. In a book the rows move as liquidity changes, and the level under your cursor becomes a different price between intent and click.',
      // A DOM is a narrow instrument in practice; stretched across a full
      // content column its size cells read as empty space.
      preview: (
        <Panel title="DOM" className="max-w-sm">
          <DomLadder
            book={market.book}
            depth={7}
            lastPrice={market.last}
            orders={[{ price: market.book.bids[1].price, quantity: 200, side: 'buy' }]}
            volumeAtPrice={generateVolumeAtPrice(market.trades)}
            onPlace={() => undefined}
            onCancel={() => undefined}
          />
        </Panel>
      ),
    },
    {
      id: 'indicator-pane',
      name: 'IndicatorPane',
      blurb: 'The sub-pane under the chart: Wilder RSI, MACD with histogram, or volume.',
      note: 'Separate from the price chart on purpose — RSI is 0-100, MACD straddles zero, volume is unbounded, and folding any of them into the price scale is what makes a chart unreadable.',
      wide: true,
      preview: (
        <Panel title="Indicators" padded>
          <div className="flex flex-col gap-2">
            <IndicatorPane candles={market.candles} kind="rsi" height={88} />
            <IndicatorPane candles={market.candles} kind="macd" height={88} />
          </div>
        </Panel>
      ),
    },
    {
      id: 'volume-profile',
      name: 'VolumeProfile',
      blurb: 'Volume traded at each price, with the point of control and value area marked.',
      note: 'Each bar’s volume is spread across the buckets its range actually covered, not dumped at its close — that shortcut invents a spike that never traded.',
      preview: (
        <Panel title="Volume at price" padded>
          <VolumeProfile candles={market.candles} height={240} />
        </Panel>
      ),
    },
    {
      id: 'market-heatmap',
      name: 'MarketHeatmap',
      blurb: 'A market or a book as a treemap: area is weight, colour is direction.',
      note: 'Squarified, not slice-and-dice — strip layouts collapse into unreadable slivers the moment one constituent dominates, and one always does.',
      wide: true,
      preview: (
        <Panel title="Heatmap" padded>
          <MarketHeatmap items={quotesToHeatmap(quotes)} height={260} onSelect={() => undefined} />
        </Panel>
      ),
    },
    {
      id: 'quote-grid',
      name: 'QuoteGrid',
      blurb: 'A dense, sortable quote board with bid, ask, volume and an inline trend.',
      wide: true,
      preview: (
        <Panel title="Quotes" scroll>
          <QuoteGrid quotes={quotes} selected={quotes[0].symbol} onSelect={() => undefined} />
        </Panel>
      ),
    },

    // --- time ---
    {
      id: 'interval-picker',
      name: 'IntervalPicker · TimeRangePicker · SessionClock',
      blurb:
        'The time controls: chart intervals with the rest behind a grouped dropdown, a lookback range, and market phase with a countdown.',
      note: 'resolveTimeRange is calendar-aware — YTD means January 1st, and a month back from the 31st is not thirty days earlier.',
      preview: (
        <Panel title="Time" padded>
          <div className="flex flex-col gap-4">
            <IntervalPicker value="5m" onChange={() => undefined} />
            <TimeRangePicker value="1M" onChange={() => undefined} />
            <SessionClock />
          </div>
        </Panel>
      ),
    },

    // --- account and risk ---
    {
      id: 'pnl-chart',
      name: 'PnlChart',
      blurb: 'The equity curve, with drawdown shaded beneath it.',
      note: 'The curve is coloured against your starting equity, but the shading is measured from the running peak — "up on the day" and "below the high-water mark" are different questions.',
      wide: true,
      preview: (
        <Panel title="Equity">
          <PnlChart points={generateEquityCurve({ points: 90 })} height={240} />
        </Panel>
      ),
    },
    {
      id: 'account-summary',
      name: 'AccountSummary · RiskMeter',
      blurb: 'Equity, day P&L, buying power and margin utilisation.',
      note: 'The margin bar is banded with its thresholds marked, because the question is not "how full" but "how close to a margin call".',
      preview: (
        <Panel title="Account">
          <AccountSummary
            account={{
              equity: 254_320,
              buyingPower: 180_000,
              previousEquity: 250_000,
              cash: 60_000,
              marginUsed: 74_000,
              marginAvailable: 120_000,
              realizedPnl: 1_240,
              unrealizedPnl: -860,
            }}
          />
          <div className="px-3 pb-3">
            <RiskMeter value={0.91} label="Concentration" />
          </div>
        </Panel>
      ),
    },
    {
      id: 'fills-table',
      name: 'FillsTable',
      blurb: 'Executions with price, fee and maker/taker, totalled at the weighted average.',
      note: 'The blotter answers "what did I send". This answers "what did I get, at what blended price, and what did it cost" — different questions the moment an order fills in pieces.',
      wide: true,
      preview: (
        <Panel title="Fills">
          <FillsTable fills={fills} />
        </Panel>
      ),
    },
    {
      id: 'allocation-bar',
      name: 'AllocationBar',
      blurb: 'Portfolio weights by gross exposure, with a concentration warning.',
      note: 'An account can look healthy on every other panel — margin fine, P&L green — while sitting in one name. Shorts are hatched as well as coloured, so the split survives greyscale.',
      preview: (
        <Panel title="Allocation" padded>
          <AllocationBar positions={positions} cash={50_000} onSelect={() => undefined} />
        </Panel>
      ),
    },
    {
      id: 'exposure-bar',
      name: 'ExposureBar',
      blurb: 'Gross exposure as a stacked bar, longs and shorts on their own tracks.',
      note: 'Gross, not net: a book long 1M and short 1M is flat on a net reading and carrying two million of risk in reality.',
      preview: (
        <Panel title="Exposure">
          <ExposureBar positions={positions} cash={50_000} onSelect={() => undefined} />
        </Panel>
      ),
    },
    {
      id: 'bracket-fields',
      name: 'BracketFields · LeverageSlider',
      blurb:
        'Stop loss and take profit with the implied risk/reward, and leverage with its liquidation distance.',
      note: 'Traders set a stop and a target separately and then never do the division. That ratio is the whole point of the component.',
      preview: (
        <Panel title="Risk" padded>
          <div className="flex flex-col gap-5">
            <BracketFields
              side="buy"
              entryPrice={market.last}
              quantity={100}
              value={{
                stopLoss: Number((market.last * 0.99).toFixed(2)),
                takeProfit: Number((market.last * 1.02).toFixed(2)),
              }}
              onChange={() => undefined}
            />
            <LeverageSlider value={20} onChange={() => undefined} />
          </div>
        </Panel>
      ),
    },
    {
      id: 'day-range-bar',
      name: 'DayRangeBar · ConnectionStatus · PriceAlerts',
      blurb:
        'Where price sits in its range, feed health with latency, and alert levels with their distance.',
      note: 'A stale price is more dangerous than no price, because it still looks tradeable — so "connected but slow" is its own state, not a green dot.',
      preview: (
        <Panel title="Status" padded>
          <div className="flex flex-col gap-4">
            <DayRangeBar
              low={quote.dayLow ?? quote.last * 0.98}
              high={quote.dayHigh ?? quote.last * 1.02}
              last={quote.last}
              outerLow={(quote.dayLow ?? quote.last) * 0.82}
              outerHigh={(quote.dayHigh ?? quote.last) * 1.18}
              previousClose={quote.prevClose}
            />
            <div className="flex flex-wrap gap-4">
              <ConnectionStatus state="connected" latencyMs={38} />
              <ConnectionStatus state="connected" latencyMs={620} />
              <ConnectionStatus state="disconnected" />
            </div>
            <PriceAlerts
              prices={{ [quote.symbol]: quote.last }}
              alerts={[
                {
                  id: 'a1',
                  symbol: quote.symbol,
                  price: Number((quote.last * 1.03).toFixed(2)),
                  direction: 'above',
                },
                {
                  id: 'a2',
                  symbol: quote.symbol,
                  price: Number((quote.last * 0.97).toFixed(2)),
                  direction: 'below',
                  triggeredAt: Date.now(),
                },
              ]}
              onRemove={() => undefined}
            />
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
