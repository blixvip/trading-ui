# trading-ui

**The trading layer for shadcn/ui.** 38 components: candlestick, depth, volume-
profile and P&L charts, an order book and a click-to-trade DOM ladder, time and
sales, dealing buttons, an order ticket with brackets and leverage, positions,
a blotter, account and risk meters, and the time controls a chart needs — built
on Radix primitives and Tailwind tokens, distributed the way shadcn distributes
components: copy the source into your app and own it.

shadcn/ui, Radix, Mantine, MUI, Chakra, Ant Design and React Aria all solve the
general UI problem well, and none of them have a candlestick chart, a price
ladder, or a tick-snapped order ticket. This fills that gap without reinventing
the parts those libraries already got right — every interactive component here
is a Radix primitive underneath, and every color is a shadcn token.

```
npx shadcn@latest add https://raw.githubusercontent.com/blixvip/trading-ui/main/r/order-book.json
```

---

## What's in it

### Charts

| Component | What it does |
| --- | --- |
| `CandleChart` | OHLC on canvas: candles, hollow, line or area; volume, moving averages, crosshair |
| `DepthChart` | Cumulative bid/ask depth, drawn as steps |
| `VolumeProfile` | Volume at price with point of control and value area |
| `PnlChart` | Equity curve with drawdown shaded from the running peak |
| `Sparkline` | Inline SVG trend line with area fill and baseline |
| `IndicatorPane` | The sub-pane under the chart: Wilder RSI, MACD with histogram, volume |

### Market data

| Component | What it does |
| --- | --- |
| `OrderBook` | Ladder or two-column book, depth bars, spread row, your-order markers |
| `DomLadder` | Click-to-trade depth of market on a fixed price axis |
| `TradeTape` | Time and sales, coloured by aggressor side, block prints called out |
| `TickerTape` | Seamless scrolling quote strip, pauses on hover |
| `QuoteGrid` | Dense, sortable multi-instrument quote board |
| `MarketHeatmap` | Squarified treemap: area is weight, colour is direction |
| `Watchlist` | Symbol list with price, change and sparkline, as a real listbox |
| `SymbolHeader` | Instrument banner: last with tick flash, change, bid/ask, range |
| `DayRangeBar` | Where price sits in its day range, with the 52-week range behind it |

### Dealing

| Component | What it does |
| --- | --- |
| `BuySellButtons` | One-click dealing with live bid/offer and the spread between |
| `QuickTradeBar` | Preset sizes, buy/sell, plus flatten and reverse |
| `OrderTicket` | Order entry with tick snapping, size slider, cost estimate, confirm |
| `BracketFields` | Stop loss and take profit with the implied risk/reward |
| `LeverageSlider` | Leverage with its liquidation distance stated |
| `PositionsTable` | Open positions marked to market, signed quantities |
| `OrderBlotter` | Today's orders and their state, with inline cancel |
| `FillsTable` | Executions with fee and maker/taker, at the weighted average price |

### Account and risk

| Component | What it does |
| --- | --- |
| `AccountSummary` | Equity, day P&L, buying power, margin |
| `MarginBar` `RiskMeter` | Banded meters that mark their thresholds |
| `ExposureBar` | Gross exposure, longs and shorts on separate tracks |
| `AllocationBar` | Portfolio weights by gross exposure, with a concentration warning |

### Time and status

| Component | What it does |
| --- | --- |
| `IntervalPicker` | Chart timeframes, favourites plus a grouped dropdown |
| `TimeRangePicker` | 1D through ALL, with a calendar-aware resolver |
| `SessionClock` | Market phase and a countdown to the next change |
| `ConnectionStatus` | Feed health, latency, staleness |
| `SymbolSearch` | Command-palette instrument search, ranked |
| `PriceAlerts` | Alert levels with how far away each one is |

### Scaffolding

| Component | What it does |
| --- | --- |
| `Panel` | Widget frame that actually shrinks inside a grid layout |
| `Price` `Delta` `Stat` | The readouts everything else is built from |
| `NumberField` `SegmentedControl` | Entry and switching, tuned for order flow |
| `EmptyState` + `*Art` | Authored SVG empty states |
| `Skeleton` + `*Skeleton` | Loading states shaped like the thing they replace |
| `PanelBoundary` | Contains a render fault to one widget, with `resetKeys` recovery |

Plus `useMockMarket` — a seeded, deterministic market feed so every component
is demoable and testable without a data provider.

## Install

### As a package

```bash
npm i trading-ui
```

```tsx
import 'trading-ui/styles.css';
import { TradingProvider, CandleChart, OrderBook, useMockMarket } from 'trading-ui';

export function Terminal() {
  const market = useMockMarket('AAPL');
  return (
    <TradingProvider theme="dark">
      <CandleChart candles={market.candles} height={400} />
      <OrderBook book={market.book} depth={10} />
    </TradingProvider>
  );
}
```

### As source (recommended)

If you already run shadcn/ui, pull components in as source and edit them like
any other file in your repo. Each item brings only what it needs:

```bash
npx shadcn@latest add https://raw.githubusercontent.com/blixvip/trading-ui/main/r/candle-chart.json
npx shadcn@latest add https://raw.githubusercontent.com/blixvip/trading-ui/main/r/order-ticket.json

# or the whole terminal at once
npx shadcn@latest add https://raw.githubusercontent.com/blixvip/trading-ui/main/r/trading-terminal.json
```

Then add the direction tokens to your stylesheet — see
[`src/lib/styles.css`](src/lib/styles.css), or install `r/trading-theme.json`.

## Theming

Token names are shadcn's (`--background`, `--card`, `--primary`, `--border`, …),
so dropping these components into an existing shadcn app gives you its look for
free. On top of that sits the vocabulary a trading UI needs and a general
library has no reason to define:

```css
--up / --up-muted / --up-line / --up-foreground
--down / --down-muted / --down-line / --down-foreground
--flat
--chart-grid / --chart-axis / --chart-crosshair
```

Three things follow from that:

**The canvas charts read the same tokens.** `ctx.fillStyle` cannot resolve
`var(--up)`, so the charts resolve tokens from the live computed style on every
draw. Override a token and the chart rethemes along with the DOM.

**Colors are hex, not oklch.** Canvas color parsing is the constraint;
everything else follows shadcn.

**Direction has a colorblind-safe mode.** Red/green is the one pairing ~8% of
men cannot separate, and direction is the most load-bearing signal here, so
`palette="colorblind"` swaps it for blue/amber:

```tsx
<TradingProvider theme="dark" palette="colorblind">
```

Direction is never carried by color alone anyway — `Delta` shows an icon and an
explicit sign, so it still reads in grayscale.

## Design decisions worth knowing

**Canvas for charts, SVG for sparklines.** A 240-bar candle chart is ~1,000 DOM
nodes as SVG and re-layouts that subtree on every tick; one canvas repaint costs
the same whether it draws 50 bars or 5,000. Sparklines go the other way —
dozens per watchlist, one canvas context each would be wasteful, and SVG scales
for free.

**`NumberField` is a text input.** `type="number"` silently changes value on
mouse wheel. One stray scroll over a price field is a wrong order. It is
`inputMode="decimal"` instead, and it keeps your raw keystrokes while focused so
typing `1.` isn't rewritten mid-keystroke.

**Book depth bars scale across both sides.** Scaling each side to its own
maximum makes a one-sided book look balanced — which is exactly the signal
you're looking at the ladder to find.

**The tape colors by aggressor, not by tick.** A print that lifted the offer is
a buy even when it's lower than the one before it.

**Positions use signed quantities.** One formula covers long and short, so no
code path can disagree about which way a short makes money.

**Fills are not orders, and exposure is gross.** `OrderBlotter` answers what you
sent; `FillsTable` answers what you got, blended at the quantity-weighted
average — an unweighted mean of fill prices is wrong on every partial sequence
and wrong in a way that looks right. `AllocationBar` weighs by gross rather
than net, because a book long 1M and short 1M is fully deployed on both legs
and nets to nothing.

**Indicators get their own pane.** RSI is 0-100, MACD straddles zero, volume is
unbounded. Folding any of them into the price scale is what makes a chart
unreadable, so `IndicatorPane` keeps its own domain and shares only the x-axis.
RSI is Wilder-smoothed, and the MACD signal EMA is seeded only from the bars
where the MACD line exists — treating the leading nulls as zeroes prints a
crossover that never happened.

**Empty and loading are designed, not left over.** A trading screen is empty
before the open and on every new account, so each list component ships an
authored SVG empty state and a skeleton shaped like the thing it is waiting for
— a ladder skeleton has a spread row — which means the layout never jumps when
data lands.

**The ticket blocks fat-fingers and warns about risk.** A buy stop below the
market is rejected (it would trigger instantly). Going short only warns — it's
legitimate, it just shouldn't be a surprise.

**A bad payload degrades one panel, never the screen.** A live feed is not a
type system: sockets drop fields, REST returns `null` for "no rows yet", and
panels mount before their first payload lands. Every data-taking component
normalizes its input and falls through to its empty state rather than throwing,
and `PanelBoundary` catches whatever is left:

```tsx
<PanelBoundary label="Order book" resetKeys={[symbol]} onError={report}>
  <OrderBook book={book} />
</PanelBoundary>
```

The failure mode this exists to prevent is the one that matters: an uncaught
error anywhere in a React tree unmounts *all* of it, so a malformed depth
message would take the blotter, the positions and the ticket down with it — at
exactly the moment a trader needs to see their exposure and get out.

## Development

```bash
npm install
npm run dev        # product site at http://localhost:4310
npm test           # 162 assertions: formatting, market invariants, order rules,
                   # SSR render, feed resilience, boundary reset logic
npm run typecheck
npm run build      # typecheck + test + library + registry
```

The site reads its initial state from the query string, so every variant has a
URL: `?theme=light&palette=colorblind&live=0&symbol=NVDA`.

### Repo layout

```
src/lib/
  components/ui/        shadcn primitives, trading-tuned (buy/sell button variants, dense table)
  components/trading/   the domain components
  data/                 deterministic mock market
  styles.css            tokens + Tailwind theme
  format.ts canvas.ts hooks.ts utils.ts
src/site/                    the product site (hero terminal, catalogue, docs)
public/                      favicon.svg, og.svg
scripts/build-registry.mjs   generates registry.json and r/*.json
test/smoke.tsx               the test suite
```

## Data

Everything in the showcase comes from a seeded random walk in
`src/lib/data/mock-market.ts`. It is not market data, and nothing in this
library connects to a venue. Wire your own feed to the plain types in
`src/lib/types.ts` (`Candle`, `OrderBookSnapshot`, `Trade`, `Quote`,
`Position`, `Order`).

## License

MIT
