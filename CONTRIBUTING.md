# Contributing

Thanks for looking. This is a component library, so most contributions are
either a new component or a fix to how an existing one behaves against real
market data.

## Getting set up

```bash
npm install
npm run dev        # product site at http://localhost:4310
npm test           # the whole suite, no test runner needed
npm run typecheck
npm run build      # typecheck + test + library + registry
```

`npm run build` is what CI runs. If it passes locally it will pass there.

## What the tests are for

`test/smoke.tsx` is a plain script: esbuild bundles it, node runs it, a
non-zero exit means something broke. No test runner, no config, no watch mode.

It covers four things, and a change should keep all four honest:

1. **Pure logic** — formatters, tick rounding, order validation, indicators,
   P&L. These are pinned against hand-worked values, not against themselves. If
   you change an indicator, work the expected number out by hand.
2. **Every component server-renders** without throwing.
3. **Feed resilience** — every data-taking component is rendered against
   `null`, `undefined`, a string, a number and an object. A component that
   throws on any of them is a component that can blank a trading screen.
4. **Accessibility affordances** — roles and labels that the markup must keep.

## Adding a component

1. Write it in `src/lib/components/trading/`. Start with `'use client'`.
2. Normalize any array prop through `toArray` / `toBook`. Render the empty
   state rather than throwing.
3. Export it from `src/lib/index.ts`.
4. Add a registry entry in `scripts/build-registry.mjs` listing only the files
   and packages it actually needs — `shadcn add`-ing one component must not
   drag in the library.
5. Add a catalogue entry in `src/site/catalogue.tsx` so it shows on the site.
6. Add it to the resilience list in `test/smoke.tsx`, and pin any new maths.
7. `npm run build`, and commit the regenerated `registry.json` and `r/*.json`.

CI fails if the registry is out of sync with the source.

## House style

- Colours come from tokens. Never hard-code a hex in a component; canvas code
  resolves tokens through `readTokens` so a theme override retints the chart.
- Direction is never carried by colour alone — pair it with a sign, an icon or
  a pattern, so it survives greyscale and deuteranopia.
- Comments explain *why*, especially where the obvious implementation is
  subtly wrong (unweighted fill averages, net-instead-of-gross exposure,
  per-side depth scaling). Skip the ones that restate the code.
- No new runtime dependencies without a reason in the PR description.

## What this project will not take

- A data feed, a broker integration, or anything that connects to a venue.
- Anything that implies the mock feed is real market data.
- Claims about latency, venues or regulatory status.
