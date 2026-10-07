# trading-ui

**The trading layer for shadcn/ui.** Candlestick and depth charts, an order
book, time and sales, an order ticket, positions and a blotter — built on Radix
primitives and Tailwind tokens, distributed the way shadcn distributes
components: copy the source into your app and own it.

shadcn/ui, Radix, Mantine, MUI, Chakra, Ant Design and React Aria all solve the
general UI problem well, and none of them have a candlestick chart, a price
ladder, or a tick-snapped order ticket. This fills that gap without reinventing
the parts those libraries already got right — every interactive component here
is a Radix primitive underneath, and every color is a shadcn token.

```
npx shadcn@latest add https://raw.githubusercontent.com/OWNER/trading-ui/main/r/order-book.json
```

---

## What's in it

| Component          | What it does                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| `CandleChart`      | OHLC on canvas: candles, hollow, line or area; volume, SMAs, crosshair      |
| `DepthChart`       | Cumulative bid/ask depth, drawn as steps                                    |
| `Sparkline`        | Inline SVG trend line with area fill and baseline                           |
| `OrderBook`        | Ladder or two-column book, depth bars, spread row, your-order markers       |
| `TradeTape`        | Time and sales, colored by aggressor side, block-print highlighting         |
| `TickerTape`       | Seamless scrolling quote strip, pauses on hover                             |
| `Watchlist`        | Symbol list with price, change and sparkline, as a real listbox             |
| `SymbolHeader`     | Instrument banner: last with tick flash, change, bid/ask, range             |
| `OrderTicket`      | Order entry with tick snapping, size slider, cost estimate, confirm dialog  |
| `PositionsTable`   | Open positions marked to market, signed quantities                          |
| `OrderBlotter`     | Today's orders and their state, with inline cancel                          |
| `Panel`            | Widget frame that actually shrinks inside a grid layout                     |
| `Price` `Delta` `Stat` `NumberField` `SegmentedControl` | The small parts the rest are built from |

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
npx shadcn@latest add https://raw.githubusercontent.com/OWNER/trading-ui/main/r/candle-chart.json
npx shadcn@latest add https://raw.githubusercontent.com/OWNER/trading-ui/main/r/order-ticket.json

# or the whole terminal at once
npx shadcn@latest add https://raw.githubusercontent.com/OWNER/trading-ui/main/r/trading-terminal.json
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

**The ticket blocks fat-fingers and warns about risk.** A buy stop below the
market is rejected (it would trigger instantly). Going short only warns — it's
legitimate, it just shouldn't be a surprise.

## Development

```bash
npm install
npm run dev        # showcase at http://localhost:4310
npm test           # 66 assertions: formatting, market invariants, order rules, SSR render
npm run typecheck
npm run build      # typecheck + test + library + registry
```

The showcase reads its initial state from the query string, so every variant has
a URL: `?view=gallery&theme=light&palette=colorblind&live=0`.

### Repo layout

```
src/lib/
  components/ui/        shadcn primitives, trading-tuned (buy/sell button variants, dense table)
  components/trading/   the domain components
  data/                 deterministic mock market
  styles.css            tokens + Tailwind theme
  format.ts canvas.ts hooks.ts utils.ts
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
