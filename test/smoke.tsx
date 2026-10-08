/* Standalone smoke suite: run with `npm test`. No test-runner dependency -
   esbuild bundles it, node runs it, a non-zero exit means something broke.
   Covers the pure logic (formatting, mock market, order rules, P&L) and then
   server-renders every exported component to catch anything that throws. */
declare const process: { exit(code: number): never };

import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Badge,
  Button,
  AllocationBar,
  CandleChart,
  Delta,
  DepthChart,
  FillsTable,
  IndicatorPane,
  NumberField,
  OrderBlotter,
  OrderBook,
  OrderTicket,
  Panel,
  PanelBoundary,
  PositionsTable,
  Price,
  ScrollArea,
  SegmentedControl,
  Sparkline,
  Stat,
  SymbolHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TickerTape,
  TradeTape,
  TradingProvider,
  Watchlist,
  cn,
  createMarket,
  decimalsOf,
  derivePosition,
  formatCompact,
  formatMoney,
  formatPercent,
  formatPrice,
  generateCandles,
  generateFills,
  generateQuotes,
  roundToTick,
  stepMarket,
  validateOrder,
  AccountSummary,
  BracketFields,
  BuySellButtons,
  ConnectionStatus,
  DayRangeBar,
  DomLadder,
  ExposureBar,
  IntervalPicker,
  LeverageSlider,
  MarketHeatmap,
  PnlChart,
  PriceAlerts,
  QuickTradeBar,
  QuoteGrid,
  RiskMeter,
  SessionClock,
  SymbolSearch,
  TimeRangePicker,
  VolumeProfile,
  ALWAYS_OPEN,
  US_EQUITIES,
  generateEquityCurve,
  generateVolumeAtPrice,
  intervalMs,
  quotesToHeatmap,
  resolveSession,
  resolveTimeRange,
  allocate,
  averageFillPrice,
  ema,
  macd,
  resetKeysChanged,
  rsi,
  toArray,
} from '../src/lib';

let failures = 0;
function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
}

console.log('formatters');
check('formatPrice groups and pads', formatPrice(1234.5, 2) === '1,234.50', formatPrice(1234.5, 2));
check('formatCompact millions', formatCompact(1_250_000) === '1.25M', formatCompact(1_250_000));
check('formatCompact 125M', formatCompact(125_400_000) === '125M', formatCompact(125_400_000));
check('formatPercent signs', formatPercent(0.0421) === '+4.21%', formatPercent(0.0421));
check('formatMoney negative', formatMoney(-1204.5) === '-$1,204.50', formatMoney(-1204.5));
check('decimalsOf(0.01)', decimalsOf(0.01) === 2, decimalsOf(0.01));
check('decimalsOf(5)', decimalsOf(5) === 0, decimalsOf(5));
check('roundToTick no float dust', roundToTick(182.4069, 0.01) === 182.41, roundToTick(182.4069, 0.01));
check('roundToTick half-dollar', roundToTick(182.3, 0.5) === 182.5, roundToTick(182.3, 0.5));

console.log('cn (tailwind-merge)');
check('later class wins', cn('p-2', 'p-4') === 'p-4', cn('p-2', 'p-4'));
check('unrelated classes kept', cn('text-up', 'font-mono') === 'text-up font-mono');
check('falsey dropped', cn('flex', false && 'hidden', undefined) === 'flex');

console.log('mock market');
const market = createMarket('AAPL', { tickSize: 0.01 }, 7);
check('candles generated', market.candles.length === 180, market.candles.length);
check(
  'ohlc invariants',
  market.candles.every(
    (c) => c.high >= Math.max(c.open, c.close) && c.low <= Math.min(c.open, c.close),
  ),
);
check('volume positive', market.candles.every((c) => c.volume > 0));
check('book does not cross', market.book.asks[0].price > market.book.bids[0].price, [
  market.book.bids[0],
  market.book.asks[0],
]);
check('bids descend', market.book.bids.every((l, i, a) => i === 0 || l.price < a[i - 1].price));
check('asks ascend', market.book.asks.every((l, i, a) => i === 0 || l.price > a[i - 1].price));
check('trades newest first', market.trades.every((t, i, a) => i === 0 || t.time <= a[i - 1].time));
check('deterministic for a seed', createMarket('AAPL', { tickSize: 0.01 }, 7).last === market.last);
check('different seeds diverge', createMarket('AAPL', { tickSize: 0.01 }, 8).last !== market.last);

// Regression: levels used to be derived from an off-grid mid, producing prices
// like 180.69862865 that *display* as 180.70 but never compare equal to it, so
// OrderBook's `myOrders` markers and click-to-prefill silently missed.
const onGrid = (p: number) => Math.abs(p * 100 - Math.round(p * 100)) < 1e-9;
check('bid levels sit on the tick grid', market.book.bids.every((l) => onGrid(l.price)), market.book.bids[0].price);
check('ask levels sit on the tick grid', market.book.asks.every((l) => onGrid(l.price)), market.book.asks[0].price);
check('prints sit on the tick grid', market.trades.every((t) => onGrid(t.price)), market.trades[0].price);
check('last price sits on the tick grid', onGrid(market.last), market.last);
check(
  'a tick-rounded touch price keys into the book',
  ({ [roundToTick(market.book.bids[0].price, 0.01)]: 100 } as Record<number, number>)[
    market.book.bids[0].price
  ] === 100,
  { seeded: roundToTick(market.book.bids[0].price, 0.01), actual: market.book.bids[0].price },
);
check(
  'no two visible levels share a displayed price',
  new Set(market.book.bids.slice(0, 11).map((l) => formatPrice(l.price, 2))).size === 11,
);

const stepped = stepMarket(market, { tickSize: 0.01 });
check('stepped last stays on the grid', onGrid(stepped.last), stepped.last);
check('stepped book stays on the grid', stepped.book.bids.every((l) => onGrid(l.price)));
check('step advances seq', stepped.seq === 1, stepped.seq);
check('step keeps candle count sane', stepped.candles.length >= market.candles.length);
check('step prepends a print', stepped.trades[0].id === 's0', stepped.trades[0].id);
check('step is pure', market.seq === 0 && market.trades[0].id !== 's0');

console.log('order validation');
check('rejects zero qty', validateOrder({ side: 'buy', type: 'market', quantity: 0 }) !== null);
check('rejects NaN qty', validateOrder({ side: 'buy', type: 'market', quantity: NaN }) !== null);
check('limit needs a price', validateOrder({ side: 'buy', type: 'limit', quantity: 10 }) !== null);
check('stop needs a price', validateOrder({ side: 'buy', type: 'stop', quantity: 10 }) !== null);
check(
  'buy stop below market rejected',
  validateOrder(
    { side: 'buy', type: 'stop', quantity: 10, stopPrice: 99 },
    { referencePrice: 100 },
  ) !== null,
);
check(
  'buy stop above market accepted',
  validateOrder(
    { side: 'buy', type: 'stop', quantity: 10, stopPrice: 101 },
    { referencePrice: 100 },
  ) === null,
);
check(
  'sell stop above market rejected',
  validateOrder(
    { side: 'sell', type: 'stop', quantity: 10, stopPrice: 101 },
    { referencePrice: 100 },
  ) !== null,
);
check(
  'buying power enforced',
  validateOrder(
    { side: 'buy', type: 'limit', quantity: 1000, limitPrice: 100 },
    { buyingPower: 5000 },
  ) !== null,
);
check(
  'fee counts toward buying power',
  validateOrder(
    { side: 'buy', type: 'limit', quantity: 50, limitPrice: 100 },
    { buyingPower: 5000, feePerOrder: 1 },
  ) !== null,
);
check(
  'valid limit passes',
  validateOrder(
    { side: 'buy', type: 'limit', quantity: 10, limitPrice: 100 },
    { buyingPower: 5000 },
  ) === null,
);
check(
  'sells are not capped by buying power',
  validateOrder(
    { side: 'sell', type: 'limit', quantity: 1000, limitPrice: 100 },
    { buyingPower: 0 },
  ) === null,
);

console.log('position math');
const short = derivePosition({ symbol: 'TSLA', quantity: -80, avgPrice: 251.1, markPrice: 243.9 });
check('short gains when mark falls', short.unrealizedPnl > 0, short.unrealizedPnl);
check('short flagged', short.isShort);
check('short market value is negative', short.marketValue < 0, short.marketValue);
const long = derivePosition({ symbol: 'AAPL', quantity: 400, avgPrice: 178.42, markPrice: 182.4 });
check('long pnl', Math.round(long.unrealizedPnl) === 1592, long.unrealizedPnl);
check('long pct', Math.abs(long.unrealizedPct - 0.02231) < 1e-4, long.unrealizedPct);
check(
  'zero-cost position does not divide by zero',
  derivePosition({ symbol: 'X', quantity: 0, avgPrice: 0, markPrice: 10 }).unrealizedPct === 0,
);

console.log('time controls');
check('intervalMs 5m', intervalMs('5m') === 300_000, intervalMs('5m'));
check('intervalMs unknown falls back', intervalMs('nope' as never) === 60_000);
{
  // 10 March 2026, a Tuesday, 11:00 local.
  const now = new Date(2026, 2, 10, 11, 0, 0);
  const [from, to] = resolveTimeRange('YTD', now.getTime());
  const fromDate = new Date(from);
  check('YTD starts on Jan 1', fromDate.getMonth() === 0 && fromDate.getDate() === 1, fromDate.toDateString());
  check('YTD ends now', to === now.getTime());
  const [m1] = resolveTimeRange('1M', new Date(2026, 2, 31, 12).getTime());
  check('1M back from Mar 31 lands in Feb/Mar, not 30 days', new Date(m1).getMonth() <= 2);
  check('ALL starts at zero', resolveTimeRange('ALL', now.getTime())[0] === 0);
}

console.log('session clock');
{
  const tuesday = (h: number, m = 0) => new Date(2026, 2, 10, h, m);
  check('open mid-session', resolveSession(US_EQUITIES, tuesday(11)).phase === 'open');
  check('pre-market before the bell', resolveSession(US_EQUITIES, tuesday(8)).phase === 'pre');
  check('after hours past the close', resolveSession(US_EQUITIES, tuesday(17)).phase === 'post');
  check('closed overnight', resolveSession(US_EQUITIES, tuesday(2)).phase === 'closed');
  const sunday = new Date(2026, 2, 8, 11);
  check('closed on a non-trading day', resolveSession(US_EQUITIES, sunday).phase === 'closed');
  const always = resolveSession(ALWAYS_OPEN, tuesday(3));
  check('24/7 venue is always open', always.phase === 'open');
  check('24/7 venue has no countdown', always.msToNext === null);
  check('countdown to the close is positive', (resolveSession(US_EQUITIES, tuesday(11)).msToNext ?? 0) > 0);
}

console.log('derived market data');
{
  const vap = generateVolumeAtPrice(market.trades, 0.01);
  const prices = Object.keys(vap).map(Number);
  check('volume-at-price keys stay on the grid', prices.every(onGrid), prices[0]);
  const totalVap = Object.values(vap).reduce((a, b) => a + b, 0);
  const totalTrades = market.trades.reduce((sum, t) => sum + t.size, 0);
  check('volume-at-price conserves size', totalVap === totalTrades, { totalVap, totalTrades });

  const curve = generateEquityCurve({ points: 60, seed: 3 });
  check('equity curve length', curve.length === 60, curve.length);
  check('equity stays positive', curve.every((p) => p.equity > 0));
  check('equity curve is ordered', curve.every((p, i, a) => i === 0 || p.time > a[i - 1].time));
  check(
    'equity curve is deterministic',
    generateEquityCurve({ points: 60, seed: 3 })[59].equity === curve[59].equity,
  );
  check(
    'equity curve actually drops below its peak',
    curve.some((p, i) => p.equity < Math.max(...curve.slice(0, i + 1).map((q) => q.equity))),
  );
}

console.log('render');
const quotes = generateQuotes();
const positions = [long, short];

const heat = quotesToHeatmap(quotes);
check('heatmap covers every quote', heat.length === quotes.length);
check('heatmap weights are positive', heat.every((h) => h.weight > 0));
check('heatmap change is a ratio, not a percent', heat.every((h) => Math.abs(h.change) < 1));
const orders = [
  {
    id: 'o1',
    time: Date.now(),
    symbol: 'AAPL',
    side: 'buy' as const,
    type: 'limit' as const,
    quantity: 100,
    limitPrice: 182.4,
    timeInForce: 'day' as const,
    status: 'working' as const,
    filledQuantity: 0,
  },
];

const tree = (
  <TradingProvider theme="dark" palette="colorblind">
    <SymbolHeader quote={quotes[0]} />
    <TickerTape quotes={quotes} />
    <Panel title="Chart" actions={<Badge variant="secondary">1m</Badge>}>
      <CandleChart
        candles={market.candles}
        height={300}
        movingAverages={[{ period: 20 }, { period: 50 }]}
      />
    </Panel>
    <Panel title="Hollow">
      <CandleChart candles={market.candles} kind="hollow" height={200} />
    </Panel>
    <Panel title="Area">
      <CandleChart candles={market.candles} kind="area" height={200} />
    </Panel>
    <Panel title="Book">
      <OrderBook book={market.book} depth={8} myOrders={{ [roundToTick(market.book.bids[0].price, 0.01)]: 100 }} />
      <OrderBook book={market.book} depth={8} layout="columns" />
      <DepthChart book={market.book} />
      <ScrollArea>
        <TradeTape trades={market.trades} blockSize={1200} />
      </ScrollArea>
    </Panel>
    <Panel title="Ticket">
      <OrderTicket
        symbol="AAPL"
        lastPrice={market.last}
        buyingPower={100000}
        positionQuantity={400}
        confirm
        onSubmit={() => undefined}
      />
    </Panel>
    <PositionsTable positions={positions} onClose={() => undefined} />
    <OrderBlotter orders={orders} onCancel={() => undefined} />
    <Watchlist quotes={quotes} selected="AAPL" />
    <Sparkline data={quotes[0].history ?? []} baseline={quotes[0].prevClose} markLast showBaseline />
    <Stat label="Last" value={<Price value={market.last} flash emphasizeLast={2} />} />
    <Delta value={1.2} percent={0.01} pill />
    <NumberField label="Qty" value={100} onChange={() => undefined} />
    <SegmentedControl
      value="a"
      onChange={() => undefined}
      options={[
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ]}
    />
    <Tabs defaultValue="one">
      <TabsList>
        <TabsTrigger value="one">One</TabsTrigger>
        <TabsTrigger value="two">Two</TabsTrigger>
      </TabsList>
      <TabsContent value="one">First</TabsContent>
    </Tabs>
    <Button variant="buy">Buy</Button>

    {/* Advanced surface */}
    <BuySellButtons bid={market.book.bids[0].price} ask={market.book.asks[0].price} quantity={100} />
    <QuickTradeBar positionQuantity={400} onTrade={() => undefined} onFlatten={() => undefined} onReverse={() => undefined} />
    <IntervalPicker value="5m" onChange={() => undefined} />
    <TimeRangePicker value="1M" onChange={() => undefined} />
    <SessionClock now={new Date(2026, 2, 10, 11, 0, 0)} />
    <SessionClock session={ALWAYS_OPEN} now={new Date(2026, 2, 10, 3, 0, 0)} />
    <DomLadder
      book={market.book}
      depth={6}
      lastPrice={market.last}
      orders={[{ price: market.book.bids[0].price, quantity: 100, side: 'buy' }]}
      volumeAtPrice={generateVolumeAtPrice(market.trades)}
      onPlace={() => undefined}
      onCancel={() => undefined}
    />
    <VolumeProfile candles={market.candles} height={200} />
    <MarketHeatmap items={quotesToHeatmap(quotes)} onSelect={() => undefined} />
    <QuoteGrid quotes={quotes} selected="AAPL" onSelect={() => undefined} />
    <DayRangeBar
      low={quotes[0].dayLow!}
      high={quotes[0].dayHigh!}
      last={quotes[0].last}
      outerLow={quotes[0].dayLow! * 0.8}
      outerHigh={quotes[0].dayHigh! * 1.2}
      previousClose={quotes[0].prevClose}
    />
    <PnlChart points={generateEquityCurve({ points: 40 })} height={180} />
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
    <RiskMeter value={0.91} label="Concentration" />
    <ExposureBar positions={positions} cash={50_000} onSelect={() => undefined} />
    <BracketFields
      side="buy"
      entryPrice={market.last}
      quantity={100}
      value={{ stopLoss: market.last * 0.99, takeProfit: market.last * 1.02 }}
      onChange={() => undefined}
    />
    <LeverageSlider value={20} onChange={() => undefined} />
    <ConnectionStatus state="connected" latencyMs={620} lastMessageAt={Date.now() - 12_000} />
    <PriceAlerts
      symbol="AAPL"
      prices={{ AAPL: market.last }}
      alerts={[
        { id: 'a1', symbol: 'AAPL', price: market.last * 1.02, direction: 'above' },
        { id: 'a2', symbol: 'AAPL', price: market.last * 0.98, direction: 'below', triggeredAt: Date.now() },
      ]}
      onCreate={() => undefined}
      onRemove={() => undefined}
    />
    <SymbolSearch quotes={quotes} open={false} onOpenChange={() => undefined} onSelect={() => undefined} />
  </TradingProvider>
);

let html = '';
try {
  html = renderToStaticMarkup(tree);
  check('renders without throwing', html.length > 2000, html.length);
} catch (error) {
  failures++;
  console.log(`  FAIL render threw -> ${(error as Error).message}`);
}

check('theme attribute applied', html.includes('data-tu-theme="dark"'));
check('dark class applied for tailwind', html.includes('dark'));
check('colorblind palette applied', html.includes('data-tu-palette="colorblind"'));
// 3 candle charts + depth chart + P&L chart. VolumeProfile and Sparkline are
// deliberately SVG, so they must not add to this count.
check('one canvas per canvas-backed chart', (html.match(/<canvas/g) ?? []).length === 5, (html.match(/<canvas/g) ?? []).length);
check('ticker duplicates the track', (html.match(/data-slot="badge"|tracking-wide/g) ?? []).length > 0);
check('radix slots rendered', html.includes('data-slot="toggle-group"'));
check('radix tabs rendered', html.includes('role="tablist"'));
// Regression: this assertion passed while the feature was broken in the app,
// because the test handed OrderBook a key taken straight from the book. The
// real path goes through roundToTick, so key off that instead.
check(
  'book marks my resting order (keyed through roundToTick)',
  html.includes('Your resting order'),
);
check('short badge rendered', html.includes('SHORT'));
check('blotter status rendered', html.includes('WORKING'));
check('ticket names the side and size', html.includes('Buy 0 AAPL'));
check('watchlist is a listbox', html.includes('role="listbox"'));
check(
  'no NaN leaked into output',
  !html.includes('NaN'),
  html.slice(Math.max(0, html.indexOf('NaN') - 80), html.indexOf('NaN') + 40),
);
check('no "undefined" leaked into output', !html.includes('undefined'));
check('no unresolved css var text', !html.includes('var(--undefined'));
check('buy/sell buttons render both sides', html.includes('Buy at') && html.includes('Sell at'));
check('session clock names the phase', html.includes('Open'));
check('dom ladder marks my resting order', html.includes('Cancel bid at'));
check('heatmap renders a tile per symbol', (html.match(/aria-label="[A-Z-]+, [+-]/g) ?? []).length >= quotes.length);
check('quote grid is sortable', html.includes('aria-sort'));
check('margin meter exposes a role', html.includes('role="meter"'));
check('risk meter names the level', html.includes('High') || html.includes('Elevated'));
check('bracket shows risk/reward', html.includes('Risk / reward'));
check('leverage states liquidation distance', html.includes('liquidation'));
check('degraded feed flagged when slow', html.includes('Degraded'));
check('triggered alert stays listed', html.includes('Triggered'));
check('day range bar is a meter', (html.match(/role="meter"/g) ?? []).length >= 2);

/* ---------------------------------------------------------------------------
   Feed resilience.

   A live feed is not a type system. Sockets drop fields, REST hands back null
   for "no rows yet", and a panel mounts before its first payload lands. None
   of that may unmount the tree - a component with nothing to show renders its
   empty state instead. Every assertion below threw before the `toArray`
   normalization went in.
   --------------------------------------------------------------------------- */
console.log('\nfeed resilience');
const JUNK: unknown[] = [null, undefined, 'not-an-array', 42, {}];

function survives(name: string, render: (bad: any) => ReactElement) {
  for (const bad of JUNK) {
    try {
      renderToStaticMarkup(<TradingProvider>{render(bad)}</TradingProvider>);
    } catch (error) {
      check(`${name} survives ${String(bad)}`, false, (error as Error).message);
      return;
    }
  }
  check(`${name} survives a malformed payload`, true);
}

survives('OrderBook', (b) => <OrderBook book={b} />);
survives('OrderBook sides', (b) => <OrderBook book={{ bids: b, asks: b }} />);
survives('DepthChart', (b) => <DepthChart book={{ bids: b, asks: b }} />);
survives('DomLadder', (b) => <DomLadder book={{ bids: b, asks: b }} />);
survives('CandleChart', (b) => <CandleChart candles={b} />);
survives('VolumeProfile', (b) => <VolumeProfile candles={b} />);
survives('PnlChart', (b) => <PnlChart points={b} />);
survives('Sparkline', (b) => <Sparkline data={b} />);
survives('Watchlist', (b) => <Watchlist quotes={b} />);
survives('QuoteGrid', (b) => <QuoteGrid quotes={b} />);
survives('TickerTape', (b) => <TickerTape quotes={b} />);
survives('TradeTape', (b) => <TradeTape trades={b} />);
survives('PositionsTable', (b) => <PositionsTable positions={b} />);
survives('OrderBlotter', (b) => <OrderBlotter orders={b} />);
survives('MarketHeatmap', (b) => <MarketHeatmap items={b} />);
survives('FillsTable', (b) => <FillsTable fills={b} />);
survives('AllocationBar', (b) => <AllocationBar positions={b} />);
survives('IndicatorPane', (b) => <IndicatorPane candles={b} />);

// Normalization must not cost referential stability, or every useMemo in the
// library re-runs on every render of a component that has no data yet.
check('toArray returns a stable identity', toArray(null) === toArray(undefined));
check('toArray passes real arrays through', toArray(quotes) === quotes);
check('toArray result is frozen', Object.isFrozen(toArray(null)));

/* PanelBoundary. React runs error boundaries on the client only - they never
   fire under renderToStaticMarkup - so what a server-side suite can assert is
   the reset logic and the fact that the happy path is transparent. */
console.log('\npanel boundary');
check('passes children through when nothing throws',
  renderToStaticMarkup(<PanelBoundary><span>live</span></PanelBoundary>).includes('live'));
check('derives error state', PanelBoundary.getDerivedStateFromError(new Error('x')).error instanceof Error);
check('reset on a changed key', resetKeysChanged(['AAPL'], ['NVDA']));
check('no reset on an identical key', !resetKeysChanged(['AAPL'], ['AAPL']));
check('reset on a longer key list', resetKeysChanged(['AAPL'], ['AAPL', '1m']));
check('reset on a shorter key list', resetKeysChanged(['AAPL', '1m'], ['AAPL']));
check('NaN keys compare as equal (Object.is)', !resetKeysChanged([NaN], [NaN]));
check('empty key lists never reset', !resetKeysChanged([], []));

/* Indicators. These are the numbers a trader acts on, and every one of them
   has a plausible-looking wrong implementation, so they are pinned against
   hand-worked values rather than against themselves. */
console.log('\nindicators');
{
  const flat = new Array(40).fill(100);
  const rising = Array.from({ length: 40 }, (_, i) => 100 + i);
  const falling = Array.from({ length: 40 }, (_, i) => 140 - i);

  check('rsi is null before the lookback', rsi(rising, 14)[13] === null);
  check('rsi starts at the lookback bar', rsi(rising, 14)[14] !== null);
  check('rsi of an unbroken rise is 100', rsi(rising, 14)[39] === 100, rsi(rising, 14)[39]);
  check('rsi of an unbroken fall is 0', rsi(falling, 14)[39] === 0, rsi(falling, 14)[39]);
  // A flat series has zero gain and zero loss; the 0/0 branch must not produce NaN.
  check('rsi of a flat series is finite', Number.isFinite(rsi(flat, 14)[39] as number), rsi(flat, 14)[39]);
  check('rsi stays inside 0-100', rsi(generateCandles({ count: 120 }).map((c) => c.close), 14)
    .every((v) => v === null || (v >= 0 && v <= 100)));
  check('rsi of too-short input is all null', rsi([1, 2, 3], 14).every((v) => v === null));

  check('ema seeds with the simple mean', ema([2, 4, 6, 8], 4)[3] === 5, ema([2, 4, 6, 8], 4)[3]);
  check('ema is null before the window', ema([2, 4, 6, 8], 4)[2] === null);
  check('ema of a constant is that constant', ema(flat, 10)[39] === 100);

  const m = macd(rising, 12, 26, 9);
  check('macd is null before the slow ema', m[24].macd === null);
  check('macd line is positive on a rise', (m[39].macd as number) > 0, m[39].macd);
  check('macd signal is not dragged to zero by leading nulls',
    m[39].signal !== null && (m[39].signal as number) > 0, m[39].signal);
  check('macd histogram is line minus signal',
    Math.abs((m[39].histogram as number) - ((m[39].macd as number) - (m[39].signal as number))) < 1e-9);
  check('macd of a flat series is zero', Math.abs(macd(flat)[39].macd as number) < 1e-9);
}

/* Fills. The weighted average is the one a desk quotes; an unweighted mean of
   fill prices is wrong on every partial sequence and wrong plausibly. */
console.log('\nfills');
{
  const fills = generateFills({ count: 12, seed: 4 });
  check('generateFills is deterministic',
    JSON.stringify(generateFills({ count: 6, seed: 4 })) === JSON.stringify(generateFills({ count: 6, seed: 4 })));
  check('fills group into parent orders', new Set(fills.map((f) => f.orderId)).size < fills.length);
  check('makers are rebated, takers charged',
    fills.filter((f) => f.liquidity === 'maker').every((f) => (f.fee ?? 0) <= 0) &&
    fills.filter((f) => f.liquidity === 'taker').every((f) => (f.fee ?? 0) >= 0));
  check('fills run newest first', fills.every((f, i) => i === 0 || f.time <= fills[i - 1].time));

  const weighted = averageFillPrice([
    { id: 'a', symbol: 'X', time: 0, side: 'buy', quantity: 900, price: 100 },
    { id: 'b', symbol: 'X', time: 0, side: 'buy', quantity: 100, price: 110 },
  ]);
  // Unweighted this would be 105. Weighted it is 101.
  check('average fill price is quantity-weighted', Math.abs(weighted - 101) < 1e-9, weighted);
  check('average fill price of nothing is 0', averageFillPrice([]) === 0);
  check('average fill price ignores a non-finite row',
    averageFillPrice([
      { id: 'a', symbol: 'X', time: 0, side: 'buy', quantity: 100, price: 50 },
      { id: 'b', symbol: 'X', time: 0, side: 'buy', quantity: NaN, price: NaN },
    ]) === 50);
}

/* Allocation. Gross, not net - netting reports an empty portfolio for a
   market-neutral book that is in fact fully deployed on both legs. */
console.log('\nallocation');
{
  const hedged = [
    { symbol: 'AAPL', quantity: 100, avgPrice: 100, markPrice: 100 },
    { symbol: 'TSLA', quantity: -100, avgPrice: 100, markPrice: 100 },
  ];
  const slices = allocate(hedged);
  check('a market-neutral book is not empty', slices.length === 2);
  check('hedged legs weigh the same', Math.abs(slices[0].weight - slices[1].weight) < 1e-9);
  check('weights sum to 1', Math.abs(slices.reduce((s, x) => s + x.weight, 0) - 1) < 1e-9);
  check('the short leg is flagged', slices.some((s) => s.short));
  check('largest position ranks first',
    allocate([
      { symbol: 'SMALL', quantity: 1, avgPrice: 1, markPrice: 1 },
      { symbol: 'BIG', quantity: 100, avgPrice: 10, markPrice: 10 },
    ])[0].symbol === 'BIG');
  check('cash becomes its own slice', allocate(hedged, 20_000).some((s) => s.symbol === 'Cash'));
  check('the tail folds into Other',
    allocate(generateQuotes().map((q, i) => ({
      symbol: q.symbol, quantity: 10 * (i + 1), avgPrice: q.last, markPrice: q.last,
    })), 0, 3).some((s) => s.symbol.startsWith('Other')));
  check('zero-value positions drop out',
    allocate([{ symbol: 'X', quantity: 0, avgPrice: 10, markPrice: 10 }]).length === 0);
  check('an empty book allocates nothing', allocate([]).length === 0);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
