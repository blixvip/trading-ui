'use client';

import { decimalsOf, roundToTick } from '../format';
import type { BookLevel, Candle, Fill, OrderBookSnapshot, Quote, Side, Trade } from '../types';

/**
 * A deterministic mock market. Seeded so screenshots, stories and tests are
 * reproducible - every component in the library can be demoed without a feed,
 * and nothing here pretends to be real market data.
 */

/** mulberry32: small, fast, good enough, and identical across runs. */
export function createRandom(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller normal, so returns are not uniformly distributed. */
function gaussian(rnd: () => number): number {
  let u = 0;
  while (u === 0) u = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

export interface GenerateCandlesOptions {
  count?: number;
  /** Starting price. */
  start?: number;
  /** Per-bar stdev as a fraction of price. */
  volatility?: number;
  /** Per-bar expected return, as a fraction. */
  drift?: number;
  intervalMs?: number;
  /** Timestamp of the last bar; defaults to now, floored to the interval. */
  endTime?: number;
  baseVolume?: number;
  seed?: number;
}

/** Geometric random walk shaped into OHLCV bars. */
export function generateCandles(options: GenerateCandlesOptions = {}): Candle[] {
  const {
    count = 180,
    start = 182.4,
    volatility = 0.006,
    drift = 0.0004,
    intervalMs = 60_000,
    endTime = Math.floor(Date.now() / intervalMs) * intervalMs,
    baseVolume = 120_000,
    seed = 7,
  } = options;

  const rnd = createRandom(seed);
  const candles: Candle[] = [];
  let price = start;

  for (let i = 0; i < count; i++) {
    const open = price;
    const shock = gaussian(rnd) * volatility;
    const close = Math.max(0.01, open * (1 + drift + shock));

    // Wicks extend beyond the body by a fraction of the bar's own range, so
    // quiet bars get small wicks and violent ones get long ones.
    const body = Math.abs(close - open);
    const wick = (body + open * volatility * 0.45) * (0.3 + rnd());
    const high = Math.max(open, close) + wick * rnd();
    const low = Math.min(open, close) - wick * rnd();

    // Volume tracks the bar's absolute move - big candles trade heavy.
    const intensity = 1 + (Math.abs(shock) / volatility) * 0.8;
    const volume = Math.round(baseVolume * intensity * (0.55 + rnd() * 0.9));

    candles.push({
      time: endTime - (count - 1 - i) * intervalMs,
      open,
      high,
      low,
      close,
      volume,
    });
    price = close;
  }

  return candles;
}

export interface GenerateBookOptions {
  mid?: number;
  levels?: number;
  tickSize?: number;
  /** Mean size at a level, before the decay with distance. */
  baseSize?: number;
  /** >1 tilts resting size toward the bid. */
  imbalance?: number;
  seed?: number;
}

/** A book whose depth thins out away from the touch, with size clusters. */
export function generateOrderBook(options: GenerateBookOptions = {}): OrderBookSnapshot {
  const {
    mid = 182.4,
    levels = 14,
    tickSize = 0.01,
    baseSize = 900,
    imbalance = 1,
    seed = 11,
  } = options;

  const rnd = createRandom(seed);
  const decimals = decimalsOf(tickSize);

  /**
   * Levels are walked in whole ticks and only converted to a price at the
   * end. The mid comes off a random walk and is not itself on the grid, so
   * deriving prices from it directly produced levels like 180.69862865 -
   * which *display* as 180.70 but are not equal to it. Anything that keys off
   * a price (marking your own resting orders, prefilling a ticket from a
   * clicked level) then silently misses.
   */
  const midTicks = Math.round(mid / tickSize);
  const spreadTicks = 1 + Math.floor(rnd() * 2);
  const bidTicks = midTicks - Math.ceil(spreadTicks / 2);
  const askTicks = bidTicks + spreadTicks;

  const build = (startTicks: number, sign: number, skew: number): BookLevel[] => {
    const out: BookLevel[] = [];
    let ticks = startTicks;
    for (let i = 0; i < levels; i++) {
      // Gaps widen deeper in the book, as they do in a real ladder.
      if (i > 0) ticks += sign * (1 + Math.floor(i / 5));
      // Size grows away from the touch, plus occasional iceberg-looking blocks.
      const growth = 1 + i * 0.22;
      const cluster = rnd() > 0.86 ? 2.8 : 1;
      const size = Math.round(baseSize * growth * cluster * skew * (0.5 + rnd()));
      out.push({ price: Number((ticks * tickSize).toFixed(decimals)), size: Math.max(1, size) });
    }
    return out;
  };

  return {
    bids: build(bidTicks, -1, imbalance),
    asks: build(askTicks, 1, 1 / imbalance),
  };
}

export interface GenerateTradesOptions {
  count?: number;
  mid?: number;
  tickSize?: number;
  /** Time of the most recent print. */
  endTime?: number;
  /** Mean gap between prints, in ms. */
  intervalMs?: number;
  seed?: number;
}

/** Recent prints, newest first - the order TradeTape renders them in. */
export function generateTrades(options: GenerateTradesOptions = {}): Trade[] {
  const {
    count = 40,
    mid = 182.4,
    tickSize = 0.01,
    endTime = Date.now(),
    intervalMs = 1400,
    seed = 23,
  } = options;

  const rnd = createRandom(seed);
  const decimals = decimalsOf(tickSize);
  const midTicks = Math.round(mid / tickSize);
  const trades: Trade[] = [];
  let time = endTime;

  for (let i = 0; i < count; i++) {
    const side = rnd() > 0.5 ? 'buy' : 'sell';
    const offsetTicks = Math.round(gaussian(rnd) * 2);
    // Round lots dominate; the occasional block print is what traders watch for.
    const size = rnd() > 0.93 ? 100 * (12 + Math.floor(rnd() * 40)) : 100 * (1 + Math.floor(rnd() * 8));
    trades.push({
      id: `t${i}-${time}`,
      time,
      price: Number(((midTicks + offsetTicks) * tickSize).toFixed(decimals)),
      size,
      side,
    });
    time -= Math.max(60, intervalMs * (0.2 + rnd() * 1.8));
  }

  return trades;
}

const UNIVERSE: Array<[string, string, number]> = [
  ['AAPL', 'Apple Inc.', 182.4],
  ['MSFT', 'Microsoft Corp.', 418.7],
  ['NVDA', 'NVIDIA Corp.', 121.35],
  ['TSLA', 'Tesla Inc.', 243.9],
  ['AMZN', 'Amazon.com Inc.', 186.2],
  ['META', 'Meta Platforms', 512.6],
  ['GOOGL', 'Alphabet Inc.', 174.85],
  ['JPM', 'JPMorgan Chase', 205.1],
  ['SPY', 'S&P 500 ETF', 548.3],
  ['BTC-USD', 'Bitcoin / USD', 63250],
];

/** A watchlist's worth of quotes, each with a short intraday history. */
export function generateQuotes(seed = 5, count = UNIVERSE.length): Quote[] {
  const rnd = createRandom(seed);
  return UNIVERSE.slice(0, count).map(([symbol, name, base]) => {
    const prevClose = base;
    const history: number[] = [];
    let price = base;
    for (let i = 0; i < 40; i++) {
      price = price * (1 + gaussian(rnd) * 0.004);
      history.push(price);
    }
    const last = history[history.length - 1];
    return {
      symbol,
      name,
      last,
      prevClose,
      bid: last - base * 0.0001,
      ask: last + base * 0.0001,
      dayHigh: Math.max(...history, base),
      dayLow: Math.min(...history, base),
      volume: Math.round((2 + rnd() * 48) * 1e6),
      history,
    };
  });
}

/**
 * Advances a snapshot by one tick: a new print, a nudged book, and either an
 * updated or freshly opened last candle. Pure, so a host can drive it from an
 * interval, a rAF loop, or a test clock.
 */
export interface MarketState {
  candles: Candle[];
  book: OrderBookSnapshot;
  trades: Trade[];
  last: number;
  seq: number;
}

export interface MarketConfig {
  tickSize?: number;
  intervalMs?: number;
  volatility?: number;
  maxCandles?: number;
  maxTrades?: number;
}

export function createMarket(
  symbol = 'AAPL',
  config: MarketConfig = {},
  seed = 7,
): MarketState {
  const { tickSize = 0.01, intervalMs = 60_000, volatility = 0.006 } = config;
  const base = UNIVERSE.find((u) => u[0] === symbol)?.[2] ?? 182.4;
  const candles = generateCandles({ start: base, intervalMs, volatility, seed });
  // The walk produces arbitrary floats; the last *traded* price has to be a
  // price someone could actually have traded at, so it snaps to the grid like
  // every other price the feed emits.
  const last = roundToTick(candles[candles.length - 1].close, tickSize);
  candles[candles.length - 1] = { ...candles[candles.length - 1], close: last };
  return {
    candles,
    book: generateOrderBook({ mid: last, tickSize, seed: seed + 4 }),
    trades: generateTrades({ mid: last, tickSize, seed: seed + 9 }),
    last,
    seq: 0,
  };
}

export function stepMarket(
  state: MarketState,
  config: MarketConfig = {},
  now = Date.now(),
): MarketState {
  const {
    tickSize = 0.01,
    intervalMs = 60_000,
    volatility = 0.006,
    maxCandles = 240,
    maxTrades = 60,
  } = config;

  const rnd = createRandom(state.seq * 2654435761 + 1);
  const drift = gaussian(rnd) * volatility * 0.25;
  // Snap to the tick grid: an off-grid last price is not a price anyone could
  // trade at, and it would leak into every print and book level derived from it.
  const last = Math.max(tickSize, roundToTick(state.last * (1 + drift), tickSize));

  const candles = state.candles.slice();
  const tail = candles[candles.length - 1];
  const bucket = Math.floor(now / intervalMs) * intervalMs;

  if (tail && bucket > tail.time) {
    candles.push({
      time: bucket,
      open: tail.close,
      high: Math.max(tail.close, last),
      low: Math.min(tail.close, last),
      close: last,
      volume: Math.round(2000 + rnd() * 8000),
    });
    if (candles.length > maxCandles) candles.shift();
  } else if (tail) {
    candles[candles.length - 1] = {
      ...tail,
      high: Math.max(tail.high, last),
      low: Math.min(tail.low, last),
      close: last,
      volume: tail.volume + Math.round(300 + rnd() * 1800),
    };
  }

  const size = rnd() > 0.93 ? 100 * (12 + Math.floor(rnd() * 40)) : 100 * (1 + Math.floor(rnd() * 8));
  const trades = [
    {
      id: `s${state.seq}`,
      time: now,
      price: last,
      size,
      side: drift >= 0 ? ('buy' as const) : ('sell' as const),
    },
    ...state.trades,
  ].slice(0, maxTrades);

  return {
    candles,
    book: generateOrderBook({
      mid: last,
      tickSize,
      seed: 11 + state.seq,
      imbalance: 0.8 + rnd() * 0.5,
    }),
    trades,
    last,
    seq: state.seq + 1,
  };
}

/* ------------------------------------------------------------------------- *
 * Generators for the portfolio and account components.
 * ------------------------------------------------------------------------- */

export interface GenerateEquityOptions {
  points?: number;
  /** Starting account equity. */
  start?: number;
  /** Per-point stdev as a fraction. */
  volatility?: number;
  drift?: number;
  intervalMs?: number;
  endTime?: number;
  seed?: number;
}

/**
 * An equity curve with realistic shape: a drift, plus occasional losing runs
 * so there is an actual drawdown for `PnlChart` to shade. A pure random walk
 * tends to look suspiciously smooth at this length.
 */
export function generateEquityCurve(options: GenerateEquityOptions = {}): EquitySample[] {
  const {
    points = 96,
    start = 250_000,
    volatility = 0.004,
    drift = 0.0012,
    intervalMs = 900_000,
    endTime = Date.now(),
    seed = 31,
  } = options;

  const rnd = createRandom(seed);
  const out: EquitySample[] = [];
  let equity = start;
  let slump = 0;

  for (let i = 0; i < points; i++) {
    if (slump <= 0 && rnd() > 0.93) slump = 3 + Math.floor(rnd() * 7);
    const bias = slump > 0 ? -volatility * 0.9 : drift;
    if (slump > 0) slump--;
    equity = Math.max(1, equity * (1 + bias + gaussian(rnd) * volatility));
    out.push({
      time: endTime - (points - 1 - i) * intervalMs,
      equity: Number(equity.toFixed(2)),
    });
  }

  return out;
}

export interface EquitySample {
  time: number;
  equity: number;
}

/** Traded volume per price level, for the DOM ladder's centre histogram. */
export function generateVolumeAtPrice(
  trades: Trade[],
  tickSize = 0.01,
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const trade of trades) {
    const price = Number((Math.round(trade.price / tickSize) * tickSize).toFixed(8));
    out[price] = (out[price] ?? 0) + trade.size;
  }
  return out;
}

export interface GenerateFillsOptions {
  count?: number;
  symbol?: string;
  mid?: number;
  tickSize?: number;
  endTime?: number;
  intervalMs?: number;
  seed?: number;
  /** Fee rate applied to notional. Makers get the negative of it as a rebate. */
  feeRate?: number;
}

/**
 * A session's executions, partial-filled the way a real order works through
 * the book: a few prints against one order id, at drifting prices.
 */
export function generateFills(options: GenerateFillsOptions = {}): Fill[] {
  const {
    count = 12,
    symbol = 'AAPL',
    mid = 182.4,
    tickSize = 0.01,
    endTime = Date.now(),
    intervalMs = 95_000,
    seed = 37,
    feeRate = 0.0002,
  } = options;

  const rnd = createRandom(seed);
  const decimals = decimalsOf(tickSize);
  const midTicks = Math.round(mid / tickSize);
  const fills: Fill[] = [];
  let time = endTime;
  let order = 0;
  let remaining = 0;
  let side: Side = 'buy';

  for (let i = 0; i < count; i++) {
    // Start a new parent order once the last one is worked off, so the table
    // shows genuine partial sequences rather than N unrelated singles.
    if (remaining <= 0) {
      order += 1;
      side = rnd() > 0.5 ? 'buy' : 'sell';
      remaining = 100 * (2 + Math.floor(rnd() * 6));
    }

    const quantity = Math.min(remaining, 100 * (1 + Math.floor(rnd() * 3)));
    remaining -= quantity;

    const price = Number(((midTicks + Math.round(gaussian(rnd) * 3)) * tickSize).toFixed(decimals));
    const maker = rnd() > 0.55;
    const notional = price * quantity;

    fills.push({
      id: `f${i}-${time}`,
      orderId: `o${order}`,
      symbol,
      time,
      side,
      quantity,
      price,
      liquidity: maker ? 'maker' : 'taker',
      // Makers are paid for providing liquidity; a negative fee is a rebate.
      fee: Number((notional * feeRate * (maker ? -0.4 : 1)).toFixed(2)),
    });

    time -= Math.max(5_000, intervalMs * (0.2 + rnd() * 1.6));
  }

  return fills;
}
