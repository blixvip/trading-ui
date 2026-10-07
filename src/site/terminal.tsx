import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  CandleChart,
  DepthChart,
  OrderBlotter,
  OrderBook,
  OrderTicket,
  Panel,
  PositionsTable,
  ScrollArea,
  SegmentedControl,
  SymbolHeader,
  TradeTape,
  Watchlist,
  type CandleChartKind,
  type Order,
  type OrderDraft,
  type Position,
  type Quote,
  useMockMarket,
} from '../lib';

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

export interface TerminalProps {
  quotes: Quote[];
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  live: boolean;
}

/**
 * The hero artifact: a working terminal assembled only from exported
 * components. It is the argument the page is making, so it is the real thing
 * rather than a screenshot of one.
 */
export function Terminal({ quotes, symbol, onSymbolChange, live }: TerminalProps) {
  const [timeframe, setTimeframe] = useState<(typeof INTERVALS)[number]['value']>('1m');
  const [kind, setKind] = useState<CandleChartKind>('candle');
  const [showMa, setShowMa] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  const intervalMs = INTERVALS.find((i) => i.value === timeframe)!.ms;
  const market = useMockMarket(symbol, {
    ticksPerSecond: 2,
    paused: !live,
    intervalMs,
    tickSize: 0.01,
  });

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

  const myOrders = useMemo(() => {
    const out: Record<number, number> = {};
    for (const order of orders) {
      if (order.symbol !== symbol || order.status !== 'working' || !order.limitPrice) continue;
      out[order.limitPrice] = (out[order.limitPrice] ?? 0) + order.quantity;
    }
    return out;
  }, [orders, symbol]);

  const submitOrder = (draft: OrderDraft) => {
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

  return (
    <div className="flex flex-col gap-2.5">
      <SymbolHeader quote={quote} />

      {/* Four columns at xl so nothing has to scroll to be read: the book and
          its depth chart share a full-height column, and positions get the
          chart's full width instead of half of it. */}
      <div className="grid grid-cols-1 gap-2.5 xl:h-[592px] xl:grid-cols-[minmax(0,1fr)_252px_236px_278px] xl:grid-rows-[minmax(0,1fr)_216px]">
        <Panel
          title={`${symbol} · ${timeframe}`}
          className="min-h-[340px] xl:col-start-1 xl:row-start-1 xl:min-h-0"
          actions={
            <>
              <Button
                size="xs"
                variant={showMa ? 'secondary' : 'ghost'}
                aria-pressed={showMa}
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
          }
        >
          <CandleChart
            candles={market.candles}
            kind={kind}
            movingAverages={showMa ? MOVING_AVERAGES : undefined}
          />
        </Panel>

        <Panel title="Positions" scroll className="xl:col-start-1 xl:row-start-2">
          <PositionsTable positions={positions} onSelect={(p) => onSymbolChange(p.symbol)} />
        </Panel>

        <Panel title="Order book" scroll className="xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <OrderBook book={market.book} depth={9} myOrders={myOrders} />
          <DepthChart book={market.book} height={112} />
        </Panel>

        <Panel title="Time &amp; sales" className="xl:col-start-3 xl:row-start-1">
          <ScrollArea className="flex-1">
            <TradeTape trades={market.trades} maxRows={30} blockSize={1200} />
          </ScrollArea>
        </Panel>

        <Panel title="Watchlist" scroll className="xl:col-start-3 xl:row-start-2">
          <Watchlist
            quotes={liveQuotes}
            selected={symbol}
            onSelect={(q) => onSymbolChange(q.symbol)}
          />
        </Panel>

        <Panel title="Order ticket" scroll className="xl:col-start-4 xl:row-span-2 xl:row-start-1">
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
        className="max-h-56"
      >
        <OrderBlotter orders={orders} onCancel={cancelOrder} />
      </Panel>
    </div>
  );
}
