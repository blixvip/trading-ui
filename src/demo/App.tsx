import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  CandleChart,
  Delta,
  DepthChart,
  NumberField,
  OrderBlotter,
  OrderBook,
  OrderTicket,
  Panel,
  PositionsTable,
  Price,
  ScrollArea,
  SegmentedControl,
  Sparkline,
  Stat,
  SymbolHeader,
  TickerTape,
  TradeTape,
  TradingProvider,
  Watchlist,
  formatCompact,
  generateQuotes,
  useMockMarket,
  type CandleChartKind,
  type DirectionPalette,
  type Instrument,
  type Order,
  type OrderDraft,
  type Position,
  type ThemeName,
} from '../lib';

const INSTRUMENT: Partial<Instrument> = {
  pricePrecision: 2,
  tickSize: 0.01,
  sizePrecision: 0,
  currency: '$',
};

const INTERVALS = [
  { value: '1m', label: '1m', ms: 60_000 },
  { value: '5m', label: '5m', ms: 300_000 },
  { value: '1h', label: '1H', ms: 3_600_000 },
  { value: '1D', label: '1D', ms: 86_400_000 },
] as const;

const SEED_POSITIONS: Position[] = [
  { symbol: 'AAPL', quantity: 400, avgPrice: 178.42, markPrice: 182.4 },
  { symbol: 'NVDA', quantity: 150, avgPrice: 128.9, markPrice: 121.35 },
  { symbol: 'TSLA', quantity: -80, avgPrice: 251.1, markPrice: 243.9 },
];

const MOVING_AVERAGES = [{ period: 20 }, { period: 50 }];

/**
 * Initial state can be driven from the query string -
 * `?view=gallery&theme=light&palette=colorblind&live=0` - so every variant has
 * a shareable URL and can be screenshotted without clicking through the UI.
 */
function param(name: string): string | null {
  if (typeof location === 'undefined') return null;
  return new URLSearchParams(location.search).get(name);
}

export default function App() {
  const [tab, setTab] = useState<'terminal' | 'gallery'>(
    param('view') === 'gallery' ? 'gallery' : 'terminal',
  );
  const [theme, setTheme] = useState<ThemeName>(param('theme') === 'light' ? 'light' : 'dark');
  const [palette, setPalette] = useState<DirectionPalette>(
    param('palette') === 'colorblind' ? 'colorblind' : 'classic',
  );
  const [symbol, setSymbol] = useState(param('symbol') ?? 'AAPL');
  const [timeframe, setTimeframe] = useState<(typeof INTERVALS)[number]['value']>('1m');
  const [kind, setKind] = useState<CandleChartKind>('candle');
  const [showMa, setShowMa] = useState(true);
  const [live, setLive] = useState(param('live') !== '0');
  const [orders, setOrders] = useState<Order[]>([]);
  const [fieldDemo, setFieldDemo] = useState<number | null>(182.4);

  const intervalMs = INTERVALS.find((i) => i.value === timeframe)!.ms;
  const market = useMockMarket(symbol, {
    ticksPerSecond: 2,
    paused: !live,
    intervalMs,
    tickSize: 0.01,
  });

  const quotes = useMemo(() => generateQuotes(), []);

  // The watchlist runs off static quotes; patch in the live symbol so the
  // selected row tracks the feed.
  const liveQuotes = useMemo(
    () =>
      quotes.map((q) =>
        q.symbol === symbol
          ? {
              ...q,
              last: market.last,
              bid: market.book.bids[0]?.price,
              ask: market.book.asks[0]?.price,
            }
          : q,
      ),
    [quotes, symbol, market.last, market.book],
  );

  const quote = liveQuotes.find((q) => q.symbol === symbol) ?? liveQuotes[0];
  const positions = useMemo(
    () => SEED_POSITIONS.map((p) => (p.symbol === symbol ? { ...p, markPrice: market.last } : p)),
    [symbol, market.last],
  );
  const position = positions.find((p) => p.symbol === symbol);

  // Working limit orders for this symbol get a dot in the ladder.
  const myOrders = useMemo(() => {
    const out: Record<number, number> = {};
    for (const order of orders) {
      if (order.symbol !== symbol || order.status !== 'working' || !order.limitPrice) continue;
      out[order.limitPrice] = (out[order.limitPrice] ?? 0) + order.quantity;
    }
    return out;
  }, [orders, symbol]);

  const submitOrder = (draft: OrderDraft) => {
    // The mock "exchange": market orders print immediately, resting orders work.
    const fills = draft.type === 'market';
    setOrders((prev) => [
      {
        ...draft,
        id: `o${prev.length + 1}-${Date.now()}`,
        time: Date.now(),
        status: fills ? 'filled' : 'working',
        filledQuantity: fills ? draft.quantity : 0,
        avgFillPrice: fills ? market.last : undefined,
      },
      ...prev,
    ]);
  };

  const cancelOrder = (order: Order) =>
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o)));

  const chartActions = (
    <>
      <Button
        size="xs"
        variant={showMa ? 'secondary' : 'ghost'}
        onClick={() => setShowMa((v) => !v)}
      >
        MA 20/50
      </Button>
      <SegmentedControl
        size="sm"
        aria-label="Interval"
        value={timeframe}
        onChange={setTimeframe}
        options={INTERVALS.map(({ value, label }) => ({ value, label }))}
      />
      <SegmentedControl
        size="sm"
        aria-label="Chart type"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'candle', label: 'Candles' },
          { value: 'hollow', label: 'Hollow' },
          { value: 'line', label: 'Line' },
          { value: 'area', label: 'Area' },
        ]}
      />
    </>
  );

  return (
    <TradingProvider
      theme={theme}
      palette={palette}
      instrument={INSTRUMENT}
      className="min-h-screen"
    >
      {/* Below xl the layout stacks and the page scrolls; at xl it becomes a
          fixed-height terminal where each panel scrolls inside its own frame. */}
      <div className="flex min-h-screen flex-col gap-2.5 p-3 xl:h-screen xl:overflow-hidden">
        <header className="flex flex-wrap items-center gap-3">
          <span className="mr-auto flex items-baseline gap-2">
            <b className="text-[15px] tracking-tight">trading-ui</b>
            <span className="text-muted-foreground text-[11px]">
              the trading layer for shadcn/ui
            </span>
          </span>
          <SegmentedControl
            aria-label="View"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'terminal', label: 'Terminal' },
              { value: 'gallery', label: 'Components' },
            ]}
          />
          <SegmentedControl
            aria-label="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
          />
          <SegmentedControl
            aria-label="Direction palette"
            value={palette}
            onChange={setPalette}
            options={[
              { value: 'classic', label: 'Green / red' },
              { value: 'colorblind', label: 'Blue / amber' },
            ]}
          />
          <Button
            size="sm"
            variant={live ? 'default' : 'outline'}
            onClick={() => setLive((v) => !v)}
          >
            {live ? 'Feed: live' : 'Feed: paused'}
          </Button>
        </header>

        <TickerTape quotes={liveQuotes} onSelect={(q) => setSymbol(q.symbol)} />

        {tab === 'terminal' ? (
          <>
            <SymbolHeader quote={quote} />

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 xl:grid-cols-[minmax(0,1fr)_270px_280px] xl:grid-rows-[minmax(320px,1fr)_minmax(200px,300px)]">
              <Panel
                title={`${symbol} - ${timeframe}`}
                actions={chartActions}
                className="min-h-[340px] xl:col-start-1 xl:row-start-1 xl:min-h-0"
              >
                <CandleChart
                  candles={market.candles}
                  kind={kind}
                  movingAverages={showMa ? MOVING_AVERAGES : undefined}
                />
              </Panel>

              <div className="grid min-h-0 grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:col-start-1 xl:row-start-2">
                <Panel title="Positions" scroll>
                  <PositionsTable positions={positions} onSelect={(p) => setSymbol(p.symbol)} />
                </Panel>
                <Panel title="Watchlist" scroll>
                  <Watchlist
                    quotes={liveQuotes}
                    selected={symbol}
                    onSelect={(q) => setSymbol(q.symbol)}
                  />
                </Panel>
              </div>

              <Panel
                title="Order book"
                className="xl:col-start-2 xl:row-start-1"
                scroll
              >
                <OrderBook book={market.book} depth={11} myOrders={myOrders} />
                <DepthChart book={market.book} height={120} />
              </Panel>

              <Panel title="Time &amp; sales" className="xl:col-start-2 xl:row-start-2">
                <ScrollArea className="flex-1">
                  <TradeTape trades={market.trades} maxRows={30} blockSize={1200} />
                </ScrollArea>
              </Panel>

              <Panel
                title="Order ticket"
                className="xl:col-start-3 xl:row-span-2 xl:row-start-1"
                scroll
              >
                <OrderTicket
                  symbol={symbol}
                  lastPrice={market.last}
                  bid={market.book.bids[0]?.price}
                  ask={market.book.asks[0]?.price}
                  buyingPower={250_000}
                  positionQuantity={position?.quantity ?? 0}
                  feePerOrder={1}
                  confirm
                  onSubmit={submitOrder}
                />
              </Panel>
            </div>

            <Panel
              title={
                <span className="flex items-center gap-2">
                  Orders <Badge variant="secondary">{orders.length}</Badge>
                </span>
              }
              scroll
              className="max-h-56 shrink-0"
            >
              <OrderBlotter orders={orders} onCancel={cancelOrder} />
            </Panel>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 xl:overflow-auto">
            <Gallery
              market={market}
              quotes={liveQuotes}
              symbol={symbol}
              positions={positions}
              orders={orders}
              fieldDemo={fieldDemo}
              onFieldDemo={setFieldDemo}
            />
          </div>
        )}

        <p className="text-muted-foreground pt-1 text-center text-[10px]">
          Every figure on this page comes from a seeded random walk in{' '}
          <code className="bg-muted rounded px-1 py-0.5 font-mono">
            src/lib/data/mock-market.ts
          </code>
          . It is not market data.
        </p>
      </div>
    </TradingProvider>
  );
}

function Gallery({
  market,
  quotes,
  symbol,
  positions,
  orders,
  fieldDemo,
  onFieldDemo,
}: {
  market: ReturnType<typeof useMockMarket>;
  quotes: ReturnType<typeof generateQuotes>;
  symbol: string;
  positions: Position[];
  orders: Order[];
  fieldDemo: number | null;
  onFieldDemo: (value: number | null) => void;
}) {
  const quote = quotes.find((q) => q.symbol === symbol) ?? quotes[0];
  const change = quote.last - quote.prevClose;

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Stat + Delta + Price">
          <div className="flex flex-wrap items-center gap-5 p-3">
            <Stat size="lg" label="Last" value={<Price value={market.last} flash emphasizeLast={2} />} />
            <Stat label="Day change" value={<Delta value={change} percent={change / quote.prevClose} />} />
            <Stat label="Volume" value={formatCompact(quote.volume ?? 0)} />
          </div>
          <div className="flex flex-wrap gap-2 px-3 pb-3">
            <Delta pill value={1.84} percent={0.0102} />
            <Delta pill value={-3.2} percent={-0.0176} />
            <Delta pill value={0} percent={0} />
          </div>
        </Panel>

        <Panel title="Sparkline">
          <div className="flex flex-wrap items-center gap-4 p-3">
            {quotes.slice(0, 4).map((q) => (
              <Sparkline
                key={q.symbol}
                data={q.history ?? []}
                baseline={q.prevClose}
                width={110}
                height={38}
                markLast
                showBaseline
                aria-label={`${q.symbol} intraday trend`}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Button variants">
          <div className="flex flex-wrap gap-2 p-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="buy">Buy</Button>
            <Button variant="sell">Sell</Button>
            <Button variant="ghost">Ghost</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Panel>

        <Panel title="NumberField">
          <div className="flex flex-col gap-2 p-3">
            <NumberField
              label="Limit price"
              value={fieldDemo}
              onChange={onFieldDemo}
              step={0.01}
              suffix="$"
            />
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Arrow keys step by <code className="bg-muted rounded px-1">step</code>, shift-arrow
              by ten. It is a text input with{' '}
              <code className="bg-muted rounded px-1">inputMode="decimal"</code>, not{' '}
              <code className="bg-muted rounded px-1">type="number"</code> - a real number input
              changes value on mouse wheel, and one stray scroll over a price field is a wrong
              order.
            </p>
          </div>
        </Panel>

        <Panel title="Order book - columns layout">
          <OrderBook book={market.book} depth={8} layout="columns" showTotal={false} />
        </Panel>

        <Panel title="Depth chart">
          <DepthChart book={market.book} height={170} />
        </Panel>

        <Panel title="Trade tape">
          <TradeTape trades={market.trades} maxRows={12} blockSize={1200} withMillis />
        </Panel>

        <Panel title="Theme tokens">
          <div className="grid grid-cols-3 gap-2 p-3">
            {[
              ['--up', 'up'],
              ['--down', 'down'],
              ['--primary', 'primary'],
              ['--card', 'card'],
              ['--muted', 'muted'],
              ['--border', 'border'],
            ].map(([token, name]) => (
              <span className="text-muted-foreground flex flex-col gap-1 text-[10px]" key={token}>
                <i
                  className="block h-8 rounded-md border"
                  style={{ background: `var(${token})` }}
                />
                {name}
              </span>
            ))}
          </div>
          <p className="text-muted-foreground px-3 pb-3 text-[11px] leading-relaxed">
            Token names match shadcn/ui, so these components inherit an existing app's theme. The
            canvas charts resolve the same variables at paint time, which is why a token override
            rethemes the chart as well as the DOM.
          </p>
        </Panel>

        <Panel title="Order ticket">
          <OrderTicket
            symbol={symbol}
            lastPrice={market.last}
            bid={market.book.bids[0]?.price}
            ask={market.book.asks[0]?.price}
            buyingPower={100_000}
            positionQuantity={400}
            feePerOrder={1}
            onSubmit={() => undefined}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        <Panel title="Candle chart - area variant with 20/50 MA">
          <CandleChart
            candles={market.candles}
            kind="area"
            height={260}
            showVolume={false}
            movingAverages={MOVING_AVERAGES}
          />
        </Panel>
        <Panel title="Positions">
          <PositionsTable positions={positions} onClose={() => undefined} />
        </Panel>
        <Panel title="Order blotter">
          <OrderBlotter orders={orders} onCancel={() => undefined} />
        </Panel>
      </div>
    </>
  );
}
