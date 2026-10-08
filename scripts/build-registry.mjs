/**
 * Builds the shadcn-compatible registry from a manifest.
 *
 * Emits two things:
 *   registry.json  - the source-of-truth index (shadcn's registry schema)
 *   r/<name>.json  - one served item per component, file contents inlined
 *
 * Doing this ourselves rather than shelling out to `shadcn build` keeps the
 * repo buildable offline and lets the manifest stay the single place where a
 * component's dependencies are declared.
 *
 * Run with: npm run registry
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOMEPAGE = 'https://github.com/OWNER/trading-ui';

/** Shared source files, referenced by name from the items below. */
const LIB = {
  utils: ['src/lib/utils.ts'],
  types: ['src/lib/types.ts'],
  format: ['src/lib/format.ts', 'src/lib/types.ts'],
  canvas: ['src/lib/canvas.ts'],
  hooks: ['src/lib/hooks.ts', 'src/lib/types.ts'],
  theme: ['src/lib/theme/theme-provider.tsx'],
};

const UI = {
  badge: 'src/lib/components/ui/badge.tsx',
  button: 'src/lib/components/ui/button.tsx',
  card: 'src/lib/components/ui/card.tsx',
  dialog: 'src/lib/components/ui/dialog.tsx',
  input: 'src/lib/components/ui/input.tsx',
  label: 'src/lib/components/ui/label.tsx',
  'scroll-area': 'src/lib/components/ui/scroll-area.tsx',
  select: 'src/lib/components/ui/select.tsx',
  separator: 'src/lib/components/ui/separator.tsx',
  slider: 'src/lib/components/ui/slider.tsx',
  table: 'src/lib/components/ui/table.tsx',
  tabs: 'src/lib/components/ui/tabs.tsx',
  'toggle-group': 'src/lib/components/ui/toggle-group.tsx',
  tooltip: 'src/lib/components/ui/tooltip.tsx',
};

const TRADING = (name) => `src/lib/components/trading/${name}.tsx`;

/** Empty-state and loading scaffolding every list component imports. */
const STATES = [TRADING('empty-state'), TRADING('illustrations'), TRADING('skeletons')];

/**
 * Every item declares the npm packages and source files it actually needs, so
 * `add`-ing one component never drags in the whole library.
 */
const items = [
  {
    name: 'trading-theme',
    type: 'registry:theme',
    title: 'Trading theme',
    description:
      'Direction tokens (up / down / flat) and chart surface tokens layered onto the shadcn palette, in light, dark, and a deuteranopia-safe variant.',
    files: ['src/lib/styles.css'],
    deps: ['tw-animate-css'],
  },
  {
    name: 'trading-lib',
    type: 'registry:lib',
    title: 'Trading utilities',
    description:
      'Number and time formatting, tick rounding, canvas scales, and the hooks the charts need (element size, price flash, reduced motion).',
    files: [...LIB.utils, ...LIB.format, ...LIB.canvas, ...LIB.hooks],
    deps: ['clsx', 'tailwind-merge'],
  },
  {
    name: 'mock-market',
    type: 'registry:lib',
    title: 'Mock market feed',
    description:
      'Seeded, deterministic market data: OHLCV bars, an order book, prints and quotes, plus a hook that ticks them. For demos, stories and tests - not market data.',
    files: ['src/lib/data/mock-market.ts', 'src/lib/data/use-mock-market.ts', ...LIB.types],
  },
  {
    name: 'trading-provider',
    type: 'registry:component',
    title: 'TradingProvider',
    description:
      'Scopes theme, direction palette and instrument formatting defaults to a subtree.',
    files: [...LIB.theme, UI.tooltip, ...LIB.utils, ...LIB.types],
    deps: ['@radix-ui/react-tooltip'],
    registry: ['trading-theme'],
  },

  // --- primitives ---
  {
    name: 'panel',
    type: 'registry:component',
    title: 'Panel',
    description: 'Widget frame: fixed header, flexible body that shrinks inside a grid layout.',
    files: [TRADING('panel'), UI.card, ...LIB.utils],
  },
  {
    name: 'segmented-control',
    type: 'registry:component',
    title: 'Segmented control',
    description:
      'Interval picker and side switch on Radix ToggleGroup, with buy/sell direction tinting and no way to end up with nothing selected.',
    files: [TRADING('segmented-control'), UI['toggle-group'], ...LIB.utils],
    deps: ['@radix-ui/react-toggle-group', 'class-variance-authority'],
  },
  {
    name: 'number-field',
    type: 'registry:component',
    title: 'Number field',
    description:
      'Price and quantity entry that keeps your keystrokes intact and refuses to change value on scroll.',
    files: [TRADING('number-field'), UI.label, ...LIB.format, ...LIB.utils],
    deps: ['@radix-ui/react-label', 'lucide-react'],
  },
  {
    name: 'price',
    type: 'registry:component',
    title: 'Price',
    description: 'Tabular price with optional tick flash and big-figure emphasis.',
    files: [TRADING('price'), ...LIB.format, ...LIB.hooks, ...LIB.theme, ...LIB.utils],
  },
  {
    name: 'delta',
    type: 'registry:component',
    title: 'Delta',
    description:
      'Change indicator that carries direction three ways - color, icon and sign - so it survives grayscale and colorblindness.',
    files: [TRADING('delta'), UI.badge, ...LIB.format, ...LIB.utils],
    deps: ['lucide-react', 'class-variance-authority'],
  },
  {
    name: 'stat',
    type: 'registry:component',
    title: 'Stat',
    description: 'Labelled figure for a KPI strip.',
    files: [TRADING('stat'), ...LIB.types, ...LIB.utils],
  },

  // --- charts ---
  {
    name: 'sparkline',
    type: 'registry:component',
    title: 'Sparkline',
    description: 'Inline SVG trend line with optional area fill and baseline.',
    files: [TRADING('sparkline'), ...LIB.utils],
  },
  {
    name: 'candle-chart',
    type: 'registry:component',
    title: 'Candle chart',
    description:
      'Canvas OHLC chart: candles, hollow candles, line or area, with volume, moving averages, crosshair and an OHLC readout.',
    files: [
      ...STATES,
      TRADING('candle-chart'),
      ...LIB.canvas,
      ...LIB.format,
      ...LIB.hooks,
      ...LIB.theme,
      ...LIB.utils,
    ],
  },
  {
    name: 'depth-chart',
    type: 'registry:component',
    title: 'Depth chart',
    description: 'Cumulative bid/ask depth, drawn as steps rather than a smoothed curve.',
    files: [
      TRADING('depth-chart'),
      ...LIB.canvas,
      ...LIB.format,
      ...LIB.hooks,
      ...LIB.theme,
      ...LIB.utils,
    ],
  },

  // --- market data ---
  {
    name: 'order-book',
    type: 'registry:component',
    title: 'Order book',
    description:
      'Ladder or two-column book with depth bars scaled across both sides, a spread row, and markers for your own resting orders.',
    files: [
      ...STATES,TRADING('order-book'), ...LIB.format, ...LIB.theme, ...LIB.utils],
  },
  {
    name: 'trade-tape',
    type: 'registry:component',
    title: 'Trade tape',
    description: 'Time and sales, colored by aggressor side, with block-print highlighting.',
    files: [
      ...STATES,TRADING('trade-tape'), ...LIB.format, ...LIB.theme, ...LIB.utils],
  },
  {
    name: 'ticker-tape',
    type: 'registry:component',
    title: 'Ticker tape',
    description:
      'Seamless scrolling quote strip that pauses on hover and stops entirely under prefers-reduced-motion.',
    files: [TRADING('ticker-tape'), TRADING('delta'), UI.badge, ...LIB.format, ...LIB.hooks, ...LIB.utils],
    deps: ['lucide-react'],
  },
  {
    name: 'watchlist',
    type: 'registry:component',
    title: 'Watchlist',
    description: 'Symbol list with price, change and an inline sparkline, as a real listbox.',
    files: [
      ...STATES,
      TRADING('watchlist'),
      TRADING('delta'),
      TRADING('sparkline'),
      UI.badge,
      ...LIB.format,
      ...LIB.utils,
    ],
    deps: ['lucide-react'],
  },
  {
    name: 'symbol-header',
    type: 'registry:component',
    title: 'Symbol header',
    description: 'Instrument banner: last price with tick flash, day change, bid/ask and range.',
    files: [
      TRADING('symbol-header'),
      TRADING('delta'),
      TRADING('stat'),
      UI.badge,
      ...LIB.format,
      ...LIB.hooks,
      ...LIB.theme,
      ...LIB.utils,
    ],
    deps: ['lucide-react'],
  },

  // --- trading ---
  {
    name: 'order-ticket',
    type: 'registry:component',
    title: 'Order ticket',
    description:
      'Order entry with tick-snapped prices, a size slider, live cost estimate, an optional confirm dialog, and validation that blocks fat-fingers but only warns about legitimate risk.',
    files: [
      TRADING('order-ticket'),
      TRADING('number-field'),
      TRADING('segmented-control'),
      UI.button,
      UI.dialog,
      UI.label,
      UI.select,
      UI.slider,
      UI['toggle-group'],
      ...LIB.format,
      ...LIB.theme,
      ...LIB.utils,
    ],
    deps: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-label',
      '@radix-ui/react-select',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-toggle-group',
      'class-variance-authority',
      'lucide-react',
    ],
  },
  {
    name: 'positions-table',
    type: 'registry:component',
    title: 'Positions table',
    description:
      'Open positions marked to market, with signed quantities so shorts need no special case.',
    files: [
      ...STATES,
      TRADING('positions-table'),
      TRADING('delta'),
      UI.badge,
      UI.button,
      UI.table,
      ...LIB.format,
      ...LIB.theme,
      ...LIB.utils,
    ],
    deps: ['@radix-ui/react-slot', 'class-variance-authority', 'lucide-react'],
  },
  {
    name: 'order-blotter',
    type: 'registry:component',
    title: 'Order blotter',
    description: "Today's orders and their state, with inline cancel.",
    files: [
      ...STATES,
      TRADING('order-blotter'),
      UI.badge,
      UI.button,
      UI.table,
      ...LIB.format,
      ...LIB.theme,
      ...LIB.utils,
    ],
    deps: ['@radix-ui/react-slot', 'class-variance-authority'],
  },
  // --- dealing ---
  {
    name: 'buy-sell-buttons',
    type: 'registry:component',
    title: 'Buy / sell buttons',
    description:
      'One-click dealing buttons with live bid and offer and the spread between them, in the FX layout: sell left, buy right.',
    files: [TRADING('buy-sell-buttons'), ...LIB.format, ...LIB.hooks, ...LIB.theme, ...LIB.utils],
  },
  {
    name: 'quick-trade-bar',
    type: 'registry:component',
    title: 'Quick trade bar',
    description:
      'Preset sizes, buy and sell, and flatten / reverse kept behind a rule so a size chip is never next to a close-everything button.',
    files: [
      TRADING('quick-trade-bar'),
      TRADING('number-field'),
      UI.button,
      UI.label,
      ...LIB.format,
      ...LIB.theme,
      ...LIB.utils,
    ],
    deps: ['@radix-ui/react-label', '@radix-ui/react-slot', 'class-variance-authority', 'lucide-react'],
  },
  {
    name: 'bracket-fields',
    type: 'registry:component',
    title: 'Bracket + leverage',
    description:
      'Stop loss and take profit with the risk/reward the pair actually implies, plus a leverage selector that states the liquidation distance.',
    files: [
      TRADING('bracket-fields'),
      TRADING('number-field'),
      UI.button,
      UI.label,
      ...LIB.format,
      ...LIB.theme,
      ...LIB.utils,
    ],
    deps: ['@radix-ui/react-label', '@radix-ui/react-slot', 'class-variance-authority', 'lucide-react'],
  },

  // --- time ---
  {
    name: 'interval-picker',
    type: 'registry:component',
    title: 'Interval picker',
    description:
      'Chart timeframes: favourites stay one click away, the rest live in a grouped dropdown, and the active interval is always visible.',
    files: [
      TRADING('interval-picker'),
      TRADING('segmented-control'),
      UI.select,
      UI['toggle-group'],
      ...LIB.utils,
    ],
    deps: ['@radix-ui/react-select', '@radix-ui/react-toggle-group', 'class-variance-authority', 'lucide-react'],
  },
  {
    name: 'time-range-picker',
    type: 'registry:component',
    title: 'Time range picker',
    description:
      '1D through ALL, with a calendar-aware resolver so YTD means January 1st and a month back from the 31st is not thirty days.',
    files: [
      TRADING('time-range-picker'),
      TRADING('segmented-control'),
      UI['toggle-group'],
      ...LIB.utils,
    ],
    deps: ['@radix-ui/react-toggle-group', 'class-variance-authority'],
  },
  {
    name: 'session-clock',
    type: 'registry:component',
    title: 'Session clock',
    description:
      'Market phase and a countdown to the next change, with pre and post sessions and a real always-open case for crypto.',
    files: [TRADING('session-clock'), UI.badge, ...LIB.utils],
    deps: ['@radix-ui/react-slot', 'class-variance-authority'],
  },

  // --- advanced market data ---
  {
    name: 'dom-ladder',
    type: 'registry:component',
    title: 'DOM ladder',
    description:
      'Click-to-trade depth of market on a fixed price axis, so the level under your cursor is still that level when you click.',
    files: [TRADING('dom-ladder'), ...LIB.format, ...LIB.theme, ...LIB.utils],
  },
  {
    name: 'volume-profile',
    type: 'registry:component',
    title: 'Volume profile',
    description:
      'Volume at price with point of control and value area, spreading each bar across the range it actually covered.',
    files: [TRADING('volume-profile'), ...LIB.format, ...LIB.theme, ...LIB.utils],
  },
  {
    name: 'market-heatmap',
    type: 'registry:component',
    title: 'Market heatmap',
    description:
      'Squarified treemap sized by weight and coloured by direction, for a market or a book.',
    files: [TRADING('market-heatmap'), ...LIB.format, ...LIB.types, ...LIB.utils],
  },
  {
    name: 'quote-grid',
    type: 'registry:component',
    title: 'Quote grid',
    description: 'A dense, sortable multi-instrument quote board with inline trends.',
    files: [
      ...STATES,
      TRADING('quote-grid'),
      TRADING('delta'),
      TRADING('price'),
      TRADING('sparkline'),
      UI.badge,
      UI.table,
      ...LIB.format,
      ...LIB.hooks,
      ...LIB.theme,
      ...LIB.utils,
    ],
    deps: ['@radix-ui/react-slot', 'class-variance-authority', 'lucide-react'],
  },
  {
    name: 'day-range-bar',
    type: 'registry:component',
    title: 'Day range bar',
    description:
      'Where price sits inside its day range, with the 52-week range on the same track so the two stay comparable.',
    files: [TRADING('day-range-bar'), ...LIB.format, ...LIB.theme, ...LIB.utils],
  },

  // --- account and risk ---
  {
    name: 'pnl-chart',
    type: 'registry:component',
    title: 'P&L chart',
    description:
      'Equity curve with drawdown shaded from the running peak, because "up on the day" and "below the high-water mark" are different questions.',
    files: [
      TRADING('pnl-chart'),
      ...LIB.canvas,
      ...LIB.format,
      ...LIB.hooks,
      ...LIB.theme,
      ...LIB.utils,
    ],
  },
  {
    name: 'account-summary',
    type: 'registry:component',
    title: 'Account summary',
    description:
      'Equity, day P&L, buying power and a banded margin meter that marks the thresholds rather than fading through them.',
    files: [
      TRADING('account-summary'),
      TRADING('delta'),
      TRADING('stat'),
      UI.badge,
      ...LIB.format,
      ...LIB.theme,
      ...LIB.types,
      ...LIB.utils,
    ],
    deps: ['@radix-ui/react-slot', 'class-variance-authority', 'lucide-react'],
  },
  {
    name: 'exposure-bar',
    type: 'registry:component',
    title: 'Exposure bar',
    description:
      'Gross exposure as a stacked bar with longs and shorts on separate tracks, so a hedged book does not read as flat.',
    files: [
      TRADING('exposure-bar'),
      TRADING('positions-table'),
      TRADING('delta'),
      UI.badge,
      UI.button,
      UI.table,
      ...STATES,
      ...LIB.format,
      ...LIB.theme,
      ...LIB.utils,
    ],
    deps: ['@radix-ui/react-slot', 'class-variance-authority', 'lucide-react'],
  },

  // --- status and search ---
  {
    name: 'connection-status',
    type: 'registry:component',
    title: 'Connection status',
    description:
      'Feed health with latency and staleness, treating "connected but slow" as its own state rather than a green dot.',
    files: [TRADING('connection-status'), UI.badge, ...LIB.utils],
    deps: ['@radix-ui/react-slot', 'class-variance-authority'],
  },
  {
    name: 'symbol-search',
    type: 'registry:component',
    title: 'Symbol search',
    description:
      'Command-palette instrument search, ranked so an exact ticker beats a prefix beats a company-name hit.',
    files: [
      TRADING('symbol-search'),
      TRADING('delta'),
      UI.badge,
      UI.dialog,
      ...LIB.format,
      ...LIB.types,
      ...LIB.utils,
    ],
    deps: ['@radix-ui/react-dialog', '@radix-ui/react-slot', 'class-variance-authority', 'lucide-react'],
  },
  {
    name: 'price-alerts',
    type: 'registry:component',
    title: 'Price alerts',
    description:
      'Alert levels with how far away each one is, and triggered alerts that stay in the list instead of vanishing.',
    files: [
      ...STATES,
      TRADING('price-alerts'),
      TRADING('number-field'),
      TRADING('segmented-control'),
      UI.badge,
      UI.button,
      UI.label,
      UI['toggle-group'],
      ...LIB.format,
      ...LIB.theme,
      ...LIB.utils,
    ],
    deps: [
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      '@radix-ui/react-toggle-group',
      'class-variance-authority',
      'lucide-react',
    ],
  },

];

/** The whole terminal in one install. */
items.push({
  name: 'trading-terminal',
  type: 'registry:block',
  title: 'Trading terminal',
  description:
    'Every trading-ui component at once: chart, book, depth, tape, ticket, positions and blotter.',
  files: [],
  registry: items.filter((i) => i.type === 'registry:component').map((i) => i.name),
});

/** Maps a repo path to where the file should land in a consumer app. */
function targetFor(path) {
  if (path.startsWith('src/lib/components/ui/')) {
    return path.replace('src/lib/components/ui/', 'components/ui/');
  }
  if (path.startsWith('src/lib/components/trading/')) {
    return path.replace('src/lib/components/trading/', 'components/trading/');
  }
  if (path.startsWith('src/lib/data/')) return path.replace('src/lib/data/', 'lib/trading/');
  if (path.startsWith('src/lib/theme/')) return path.replace('src/lib/theme/', 'components/trading/');
  if (path === 'src/lib/styles.css') return 'app/trading-ui.css';
  return path.replace('src/lib/', 'lib/trading/');
}

function typeFor(path, itemType) {
  if (path.endsWith('.css')) return 'registry:style';
  if (path.startsWith('src/lib/components/')) return 'registry:component';
  if (path.startsWith('src/lib/theme/')) return 'registry:component';
  if (itemType === 'registry:lib') return 'registry:lib';
  return 'registry:lib';
}

const unique = (xs) => [...new Set(xs)];

const index = {
  $schema: 'https://ui.shadcn.com/schema/registry.json',
  name: 'trading-ui',
  homepage: HOMEPAGE,
  items: items.map((item) => ({
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    ...(item.deps?.length ? { dependencies: unique(item.deps) } : {}),
    ...(item.registry?.length
      ? { registryDependencies: item.registry.map((n) => `@trading-ui/${n}`) }
      : {}),
    files: unique(item.files).map((path) => ({
      path,
      type: typeFor(path, item.type),
      target: targetFor(path),
    })),
  })),
};

await writeFile(join(root, 'registry.json'), `${JSON.stringify(index, null, 2)}\n`);

// Served items: same shape, with file contents inlined.
const outDir = join(root, 'r');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const item of index.items) {
  const files = await Promise.all(
    item.files.map(async (file) => ({
      ...file,
      content: await readFile(join(root, file.path), 'utf8'),
    })),
  );
  const payload = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    ...item,
    files,
  };
  await writeFile(join(outDir, `${item.name}.json`), `${JSON.stringify(payload, null, 2)}\n`);
}

console.log(`registry.json + r/*.json written for ${index.items.length} items`);
