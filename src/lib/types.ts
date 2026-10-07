/** Shared domain types. Deliberately plain so any feed can map onto them. */

export type Side = 'buy' | 'sell';
export type Direction = 'up' | 'down' | 'flat';

/** One OHLCV bar. `time` is epoch milliseconds at the bar's open. */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** A single price level in the book. */
export interface BookLevel {
  price: number;
  size: number;
}

export interface OrderBookSnapshot {
  /** Highest price first. */
  bids: BookLevel[];
  /** Lowest price first. */
  asks: BookLevel[];
}

export interface Trade {
  id: string;
  time: number;
  price: number;
  size: number;
  /** Aggressor side: `buy` means it lifted the offer. */
  side: Side;
}

export interface Quote {
  symbol: string;
  name?: string;
  last: number;
  /** Previous session close, used for the day change. */
  prevClose: number;
  bid?: number;
  ask?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  /** Optional intraday series for an inline sparkline. */
  history?: number[];
}

export interface Position {
  symbol: string;
  /** Signed: negative is short. */
  quantity: number;
  avgPrice: number;
  markPrice: number;
}

export type OrderType = 'market' | 'limit' | 'stop' | 'stop-limit';
export type OrderStatus = 'working' | 'filled' | 'partial' | 'cancelled' | 'rejected';

export interface OrderDraft {
  symbol: string;
  side: Side;
  type: OrderType;
  quantity: number;
  /** Required for limit / stop-limit. */
  limitPrice?: number;
  /** Required for stop / stop-limit. */
  stopPrice?: number;
  timeInForce: TimeInForce;
}

export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok';

export interface Order extends OrderDraft {
  id: string;
  time: number;
  status: OrderStatus;
  filledQuantity: number;
  avgFillPrice?: number;
}

/** Price/size formatting rules for an instrument. */
export interface Instrument {
  symbol: string;
  name?: string;
  /** Decimal places for price. */
  pricePrecision: number;
  /** Minimum price increment. */
  tickSize: number;
  /** Decimal places for quantity. */
  sizePrecision?: number;
  /** Quote-currency symbol, e.g. "$". */
  currency?: string;
}
