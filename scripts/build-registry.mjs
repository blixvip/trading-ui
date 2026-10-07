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
    files: [TRADING('order-book'), ...LIB.format, ...LIB.theme, ...LIB.utils],
  },
  {
    name: 'trade-tape',
    type: 'registry:component',
    title: 'Trade tape',
    description: 'Time and sales, colored by aggressor side, with block-print highlighting.',
    files: [TRADING('trade-tape'), ...LIB.format, ...LIB.theme, ...LIB.utils],
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
