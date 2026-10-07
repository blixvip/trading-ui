import { useMemo, useState } from 'react';
import {
  Button,
  OrderBook,
  OrderBookSkeleton,
  Panel,
  SegmentedControl,
  TickerTape,
  TradingProvider,
  createMarket,
  generateQuotes,
  type DirectionPalette,
  type Instrument,
  type Position,
  type ThemeName,
} from '../lib';
import { GridField, Logomark, Wordmark } from './brand';
import { CatalogueRow, buildCatalogue } from './catalogue';
import { CopyCommand } from './copy-command';
import { Terminal } from './terminal';
import './site.css';

const INSTRUMENT: Partial<Instrument> = {
  pricePrecision: 2,
  tickSize: 0.01,
  sizePrecision: 0,
  currency: '$',
};

const CATALOGUE_POSITIONS: Position[] = [
  { symbol: 'AAPL', quantity: 400, avgPrice: 178.42, markPrice: 182.4 },
  { symbol: 'NVDA', quantity: 150, avgPrice: 128.9, markPrice: 121.35 },
  { symbol: 'TSLA', quantity: -80, avgPrice: 251.1, markPrice: 243.9 },
];

const REPO = 'https://github.com/OWNER/trading-ui';

/** Initial state from the query string, so every variant has a shareable URL. */
function param(name: string): string | null {
  if (typeof location === 'undefined') return null;
  return new URLSearchParams(location.search).get(name);
}

export default function App() {
  const [theme, setTheme] = useState<ThemeName>(param('theme') === 'light' ? 'light' : 'dark');
  const [palette, setPalette] = useState<DirectionPalette>(
    param('palette') === 'colorblind' ? 'colorblind' : 'classic',
  );
  const [symbol, setSymbol] = useState(param('symbol') ?? 'AAPL');
  const [live, setLive] = useState(param('live') !== '0');

  const quotes = useMemo(() => generateQuotes(), []);
  // The catalogue runs off one frozen snapshot: ten previews each driving
  // their own feed would make the page a space heater and the screenshots
  // non-reproducible.
  const snapshot = useMemo(() => createMarket('AAPL', { tickSize: 0.01 }, 7), []);
  const catalogue = useMemo(
    () => buildCatalogue(snapshot, quotes, CATALOGUE_POSITIONS),
    [snapshot, quotes],
  );

  return (
    <TradingProvider theme={theme} palette={palette} instrument={INSTRUMENT} className="bg-site-bg">
      <div className="bg-site-bg text-foreground min-h-screen">
        <Header
          theme={theme}
          onTheme={setTheme}
          palette={palette}
          onPalette={setPalette}
          live={live}
          onLive={setLive}
        />

        <main>
          <Hero
            live={live}
            quotes={quotes}
            symbol={symbol}
            onSymbolChange={setSymbol}
          />

          <Positioning />

          <section id="components" className="mx-auto w-full max-w-[1400px] px-4 pb-8 sm:px-8">
            <SectionHead
              title="Every component"
              lead="Each one installs on its own and pulls only the files and packages it actually needs. These previews are the real components running on a frozen snapshot of the mock feed."
            />
            {catalogue.map((entry) => (
              <CatalogueRow key={entry.id} entry={entry} />
            ))}
          </section>

          <States />
          <Theming />
          <Install />
        </main>

        <Footer />
      </div>
    </TradingProvider>
  );
}

function Header({
  theme,
  onTheme,
  palette,
  onPalette,
  live,
  onLive,
}: {
  theme: ThemeName;
  onTheme: (t: ThemeName) => void;
  palette: DirectionPalette;
  onPalette: (p: DirectionPalette) => void;
  live: boolean;
  onLive: (v: boolean) => void;
}) {
  return (
    <header className="border-site-rule bg-site-bg/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-8">
        <Wordmark className="flex items-center gap-2.5" />

        <nav className="text-muted-foreground hidden items-center gap-5 text-[13px] md:flex">
          <a className="hover:text-foreground transition-colors" href="#components">
            Components
          </a>
          <a className="hover:text-foreground transition-colors" href="#states">
            States
          </a>
          <a className="hover:text-foreground transition-colors" href="#theming">
            Theming
          </a>
          <a className="hover:text-foreground transition-colors" href="#install">
            Install
          </a>
        </nav>

        {/* Wraps to its own line on a phone: as one unbreakable row this
            cluster is 426px wide and drags the whole page sideways. */}
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          <SegmentedControl
            size="sm"
            aria-label="Theme"
            value={theme}
            onChange={onTheme}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
          />
          <SegmentedControl
            size="sm"
            aria-label="Direction palette"
            value={palette}
            onChange={onPalette}
            options={[
              { value: 'classic', label: 'Green / red' },
              { value: 'colorblind', label: 'Blue / amber' },
            ]}
          />
          <Button
            size="sm"
            variant={live ? 'secondary' : 'outline'}
            aria-pressed={live}
            onClick={() => onLive(!live)}
            className="gap-2"
          >
            <span
              aria-hidden="true"
              className={live ? 'bg-up size-1.5 rounded-full' : 'bg-flat size-1.5 rounded-full'}
            />
            {live ? 'Live' : 'Paused'}
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <a href={REPO} target="_blank" rel="noreferrer noopener">
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero({
  live,
  quotes,
  symbol,
  onSymbolChange,
}: {
  live: boolean;
  quotes: ReturnType<typeof generateQuotes>;
  symbol: string;
  onSymbolChange: (s: string) => void;
}) {
  return (
    <section className="border-site-rule relative overflow-hidden border-b">
      <GridField className="text-site-rule pointer-events-none absolute inset-0 h-full w-full grid-in" />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-14 pb-10 sm:px-8 sm:pt-20">
        <div className="max-w-4xl">
          <h1
            className="font-mono text-[clamp(2.1rem,6vw,4.25rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance rise"
            style={{ animationDelay: '60ms' }}
          >
            The trading layer
            <br />
            for shadcn/ui.
          </h1>
          <p
            className="text-muted-foreground mt-6 max-w-[62ch] text-[15px] leading-relaxed text-pretty sm:text-base rise"
            style={{ animationDelay: '160ms' }}
          >
            Candlestick and depth charts, a price ladder, time and sales, a tick-snapped order
            ticket, positions and a blotter. Built on Radix primitives, themed with shadcn's own
            tokens, and installed as source you own.
          </p>

          <div
            className="mt-7 flex flex-wrap items-center gap-3 rise"
            style={{ animationDelay: '240ms' }}
          >
            <CopyCommand
              command="npx shadcn@latest add https://raw.githubusercontent.com/OWNER/trading-ui/main/r/trading-terminal.json"
              label="npx shadcn@latest add …/r/trading-terminal.json"
              className="min-w-0 flex-1 sm:max-w-xl"
            />
            <Button asChild>
              <a href="#components">Browse components</a>
            </Button>
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[1400px] px-4 pb-4 sm:px-8">
        <TickerTape quotes={quotes} onSelect={(q) => onSymbolChange(q.symbol)} />
      </div>

      <div
        className="relative mx-auto w-full max-w-[1400px] px-4 pb-12 sm:px-8 rise"
        style={{ animationDelay: '320ms' }}
      >
        <Terminal
          quotes={quotes}
          symbol={symbol}
          onSymbolChange={onSymbolChange}
          live={live}
        />
        <p className="text-muted-foreground mt-3 text-center text-[11px]">
          A working terminal, not a screenshot — every panel above is an exported component, driven
          by a seeded random walk. It is not market data.
        </p>
      </div>
    </section>
  );
}

function SectionHead({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="max-w-3xl pt-16 pb-2">
      <h2 className="font-mono text-[clamp(1.5rem,3.2vw,2.25rem)] leading-tight font-semibold tracking-[-0.035em]">
        {title}
      </h2>
      <p className="text-muted-foreground mt-3 max-w-[68ch] text-[14px] leading-relaxed text-pretty">
        {lead}
      </p>
    </div>
  );
}

/** The argument, as prose and a comparison — not three icon cards. */
function Positioning() {
  const rows = [
    [
      'It inherits your theme instead of fighting it',
      'Token names are shadcn’s — --background, --card, --primary, --border. Drop a component into an existing shadcn app and it already looks like the rest of it.',
    ],
    [
      'The primitives are Radix, not hand-rolled',
      'Toggle groups, selects, sliders, dialogs, scroll areas and tooltips come from Radix, so focus management, typeahead and portalling behave the way the rest of your app does.',
    ],
    [
      'Direction is a token layer, and never colour alone',
      '--up / --down / --flat ship with a deuteranopia-safe alternative, and every change indicator also carries an icon and an explicit sign.',
    ],
    [
      'It knows what a book and a tape are',
      'Depth bars scale across both sides. The tape colours by aggressor. Positions are signed. Prices snap to the instrument’s tick before anything keys off them.',
    ],
  ];

  return (
    <section className="border-site-rule mx-auto w-full max-w-[1400px] border-b px-4 pb-16 sm:px-8">
      <SectionHead
        title="Why this exists"
        lead="shadcn/ui, Radix, MUI, Mantine, Chakra, Ant Design and React Aria all solve the general UI problem well. None of them has a candlestick chart, a price ladder, or an order ticket — so every trading product rebuilds those from scratch, badly, on a deadline."
      />
      <dl className="mt-8 grid grid-cols-1 gap-x-14 gap-y-8 md:grid-cols-2">
        {rows.map(([term, detail]) => (
          <div key={term} className="border-site-rule border-t pt-4">
            <dt className="text-[14px] font-semibold tracking-tight">{term}</dt>
            <dd className="text-muted-foreground mt-1.5 max-w-[52ch] text-[13px] leading-relaxed">
              {detail}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Empty and loading are primary screens here, so the page shows them. */
function States() {
  const emptyBook = { bids: [], asks: [] };
  return (
    <section
      id="states"
      className="border-site-rule mx-auto w-full max-w-[1400px] border-b px-4 pb-16 sm:px-8"
    >
      <SectionHead
        title="Empty and loading are designed, not left over"
        lead="A trading screen is empty before the open, between sessions, and on every new account. Each list component ships an authored illustration for when it has nothing, and a skeleton shaped like the thing it is waiting for — so the layout never jumps when data lands."
      />
      <div className="mt-8 grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        <Panel title="Loading">
          <OrderBookSkeleton depth={6} />
        </Panel>
        <Panel title="Empty">
          <OrderBook book={emptyBook} />
        </Panel>
        <Panel title="Live">
          <OrderBook book={createMarket('AAPL', { tickSize: 0.01 }, 7).book} depth={6} />
        </Panel>
      </div>
    </section>
  );
}

function Theming() {
  const tokens: Array<[string, string]> = [
    ['--up', 'gains, bids, buys'],
    ['--down', 'losses, offers, sells'],
    ['--flat', 'unchanged'],
    ['--primary', 'interface accent'],
    ['--card', 'panel ground'],
    ['--border', 'hairlines'],
    ['--chart-grid', 'chart gridlines'],
    ['--chart-axis', 'axis labels'],
  ];

  return (
    <section
      id="theming"
      className="border-site-rule mx-auto w-full max-w-[1400px] border-b px-4 pb-16 sm:px-8"
    >
      <SectionHead
        title="One set of tokens, including the canvas"
        lead="Canvas cannot resolve var(--up), so the charts read their colours from the live computed style on every draw. Override a token and the chart rethemes with the DOM — try the theme and palette switches in the header and watch the candles follow."
      />
      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        {tokens.map(([token, role]) => (
          <div key={token} className="flex flex-col gap-2">
            <span
              aria-hidden="true"
              className="border-border h-12 w-full rounded-md border"
              style={{ background: `var(${token})` }}
            />
            <span className="font-mono text-[11px]">{token}</span>
            <span className="text-muted-foreground -mt-1.5 text-[11px]">{role}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Install() {
  return (
    <section id="install" className="mx-auto w-full max-w-[1400px] px-4 pb-20 sm:px-8">
      <SectionHead
        title="Two ways in"
        lead="Take the source if you want to own and edit it, which is what most people should do. Take the package if you just want it to work."
      />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="border-site-rule flex flex-col gap-3 border-t pt-5">
          <h3 className="font-mono text-[14px] font-semibold">As source</h3>
          <p className="text-muted-foreground max-w-[52ch] text-[13px] leading-relaxed">
            A shadcn registry. Files land in your repo, use your aliases, and are yours to change.
            Each item pulls only its own dependencies.
          </p>
          <CopyCommand
            size="sm"
            command="npx shadcn@latest add https://raw.githubusercontent.com/OWNER/trading-ui/main/r/order-book.json"
            label="shadcn add …/r/order-book.json"
          />
          <CopyCommand
            size="sm"
            command="npx shadcn@latest add https://raw.githubusercontent.com/OWNER/trading-ui/main/r/trading-terminal.json"
            label="shadcn add …/r/trading-terminal.json"
          />
        </div>

        <div className="border-site-rule flex flex-col gap-3 border-t pt-5">
          <h3 className="font-mono text-[14px] font-semibold">As a package</h3>
          <p className="text-muted-foreground max-w-[52ch] text-[13px] leading-relaxed">
            Ships compiled CSS, so it works with or without Tailwind in the host app. React and
            Radix stay external.
          </p>
          <CopyCommand size="sm" command="npm i trading-ui" />
          <pre className="border-border bg-card text-foreground overflow-x-auto rounded-lg border p-3.5 font-mono text-[12px] leading-relaxed">
            <code>{`import 'trading-ui/styles.css';
import { TradingProvider, CandleChart } from 'trading-ui';

<TradingProvider theme="dark">
  <CandleChart candles={candles} height={400} />
</TradingProvider>`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-site-rule border-t">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-10 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Logomark className="size-6" />
          <span className="text-muted-foreground text-[12px]">MIT licensed</span>
          <a
            className="text-muted-foreground hover:text-foreground text-[12px] transition-colors"
            href={REPO}
            target="_blank"
            rel="noreferrer noopener"
          >
            Source
          </a>
        </div>
        <p className="text-muted-foreground/80 max-w-[80ch] text-[11px] leading-relaxed">
          Every figure on this page comes from a seeded random walk in{' '}
          <code className="bg-card rounded px-1 py-0.5 font-mono">src/lib/data/mock-market.ts</code>
          . It is not market data, it is not a price feed, and nothing here connects to a venue or a
          broker. trading-ui renders whatever data you give it.
        </p>
      </div>
    </footer>
  );
}
