/**
 * trading-ui - the trading layer for shadcn/ui.
 *
 * Built on Radix primitives and Tailwind tokens, using shadcn's token names
 * (--background, --card, --primary, --border, ...) so these components inherit
 * the look of an existing shadcn app, plus a direction layer (--up / --down)
 * that general-purpose libraries have no vocabulary for.
 *
 * Import the stylesheet once at your app root:
 *   import 'trading-ui/styles.css';
 */

import './styles.css';

// Theme
export {
  TradingProvider,
  useTradingTheme,
  useInstrument,
  defaultInstrument,
} from './theme/theme-provider';
export type {
  TradingProviderProps,
  TradingTheme,
  ThemeName,
  DirectionPalette,
} from './theme/theme-provider';

// --- shadcn/ui primitives (re-exported so the package works standalone) ---
export { Badge, badgeVariants } from './components/ui/badge';
export { Button, buttonVariants, type ButtonProps } from './components/ui/button';
export {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog';
export { Input } from './components/ui/input';
export { Label } from './components/ui/label';
export { ScrollArea, ScrollBar } from './components/ui/scroll-area';
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
export { Separator } from './components/ui/separator';
export { Slider } from './components/ui/slider';
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
export {
  ToggleGroup,
  ToggleGroupItem,
  toggleGroupItemVariants,
} from './components/ui/toggle-group';
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './components/ui/tooltip';

// --- trading components ---
export { Panel, type PanelProps } from './components/trading/panel';
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentOption,
} from './components/trading/segmented-control';
export { NumberField, type NumberFieldProps } from './components/trading/number-field';
export { Price, type PriceProps } from './components/trading/price';
export { Delta, type DeltaProps } from './components/trading/delta';
export { Stat, type StatProps } from './components/trading/stat';

export { Sparkline, type SparklineProps } from './components/trading/sparkline';
export {
  CandleChart,
  type CandleChartProps,
  type CandleChartKind,
  type MovingAverage,
} from './components/trading/candle-chart';
export { DepthChart, type DepthChartProps } from './components/trading/depth-chart';

export {
  OrderBook,
  type OrderBookProps,
  type BookLayout,
} from './components/trading/order-book';
export { TradeTape, type TradeTapeProps } from './components/trading/trade-tape';
export { TickerTape, type TickerTapeProps } from './components/trading/ticker-tape';
export { Watchlist, type WatchlistProps } from './components/trading/watchlist';
export { SymbolHeader, type SymbolHeaderProps } from './components/trading/symbol-header';

export {
  OrderTicket,
  validateOrder,
  type OrderTicketProps,
  type ValidateOrderOptions,
} from './components/trading/order-ticket';
export {
  PositionsTable,
  derivePosition,
  type PositionsTableProps,
  type PositionRow,
} from './components/trading/positions-table';
export { OrderBlotter, type OrderBlotterProps } from './components/trading/order-blotter';

// --- utilities ---
export { cn } from './utils';
export {
  formatPrice,
  formatQuantity,
  formatCompact,
  formatPercent,
  formatSigned,
  formatMoney,
  formatTime,
  formatAxisTime,
  directionOf,
  directionClass,
  directionArrow,
  roundToTick,
  decimalsOf,
} from './format';
export {
  useElementSize,
  usePriceFlash,
  usePrevious,
  useAnimationFrame,
  useReducedMotion,
} from './hooks';

// --- deterministic mock market, for demos, stories and tests ---
export {
  createRandom,
  generateCandles,
  generateOrderBook,
  generateTrades,
  generateQuotes,
  createMarket,
  stepMarket,
} from './data/mock-market';
export type {
  MarketState,
  MarketConfig,
  GenerateCandlesOptions,
  GenerateBookOptions,
  GenerateTradesOptions,
} from './data/mock-market';
export { useMockMarket, type UseMockMarketOptions } from './data/use-mock-market';

// --- domain types ---
export type {
  Side,
  Direction,
  Candle,
  BookLevel,
  OrderBookSnapshot,
  Trade,
  Quote,
  Position,
  Order,
  OrderDraft,
  OrderType,
  OrderStatus,
  TimeInForce,
  Instrument,
} from './types';
