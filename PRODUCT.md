# PRODUCT.md

## What this is

**trading-ui** — a React component library for building trading interfaces. It
is the layer that shadcn/ui, Radix, MUI, Mantine, Chakra, Ant Design and React
Aria all leave empty: candlestick and depth charts, a price ladder, time and
sales, a tick-snapped order ticket, positions and a blotter.

It is not a trading platform, a data feed, or a broker integration. It connects
to nothing. It renders whatever OHLCV, book, print, quote and position data you
hand it.

## Who it is for

Developers building a trading, brokerage, crypto-exchange, portfolio or market-
data product in React — most of whom already run Tailwind and shadcn/ui and do
not want a second design system fighting the one they have.

Their alternative today is gluing `lightweight-charts` to hand-rolled tables and
inventing the order ticket themselves.

## What makes it different

1. **It is the trading layer *for* shadcn, not a rival to it.** Token names are
   shadcn's, so it inherits an existing app's theme. Every interactive part is a
   Radix primitive. It installs as source through a shadcn registry.
2. **It knows the domain.** The tape colors by aggressor not tick; book depth
   bars scale across both sides; positions use signed quantities; the ticket
   blocks fat-fingers but only warns about legitimate risk.
3. **Direction is a first-class token layer** (`--up` / `--down` / `--flat`),
   with a deuteranopia-safe palette, and it is never carried by color alone.

## Proof we can actually show

- A live, running terminal driven by a deterministic mock feed — the real
  components, not screenshots.
- Both palettes and both themes, switchable in place.
- 128 passing assertions; the package verified in a from-scratch consumer app.

## Non-negotiable truths

- Nothing here may imply it is real market data. The feed is a seeded random
  walk and must say so wherever it is shown.
- No claims about venues, brokers, latency, or regulatory status.
- Accessibility is product, not polish: direction must survive grayscale and
  colorblindness.

## Success for the site

A developer lands, immediately sees a real trading terminal running, understands
within seconds that it is shadcn-compatible, and can copy an install command for
the one component they came for.
