/* Standalone smoke suite: run with `npm test`. No test-runner dependency -
   esbuild bundles it, node runs it, a non-zero exit means something broke.
   Covers the pure logic (formatting, mock market, order rules, P&L) and then
   server-renders every exported component to catch anything that throws. */
declare const process: { exit(code: number): never };

import { renderToStaticMarkup } from 'react-dom/server';
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
  generateQuotes,
  roundToTick,
  stepMarket,
  validateOrder,
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

const stepped = stepMarket(market, { tickSize: 0.01 });
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

console.log('render');
const quotes = generateQuotes();
const positions = [long, short];
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
      <OrderBook book={market.book} depth={8} myOrders={{ [market.book.bids[0].price]: 100 }} />
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
check('canvas present for each chart', (html.match(/<canvas/g) ?? []).length === 4, (html.match(/<canvas/g) ?? []).length);
check('ticker duplicates the track', (html.match(/data-slot="badge"|tracking-wide/g) ?? []).length > 0);
check('radix slots rendered', html.includes('data-slot="toggle-group"'));
check('radix tabs rendered', html.includes('role="tablist"'));
check('book marks my resting order', html.includes('Your resting order'));
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

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
