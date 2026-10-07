# DESIGN.md

## The world: instrument panel

Not a SaaS landing page with a product screenshot. The surface should read like
a piece of **measuring equipment** — an exchange terminal, an oscilloscope, a
bench instrument. Precision, density, hairlines, and live numbers. The product
*is* data on a dark screen, so the page is a dark screen with data on it.

Anti-references: the three-column feature-card marketing page; soft pastel
gradients; floating glassy screenshots on a purple mesh; anything that looks
like it could equally be selling a CRM.

## Ground and material

- **Near-black ground** (`#07090e`), below the component `--background`, so the
  components sit *on* the page as lit instruments rather than blending into it.
- **A faint engraved grid** behind the hero — an authored SVG pattern at very
  low opacity, like graph paper or a phosphor screen. It is the only decorative
  texture on the page and it never competes with real chart gridlines.
- **Hairlines over cards.** Sections are separated by 1px rules, not stacked in
  rounded boxes. Cards appear only where the library's own `Panel` appears,
  because there a frame is the component's job.
- **Light comes from the data.** The only saturated color on the page is
  direction green/red and the single interface accent. No decorative color.

## Type

Self-hosted, never a system stack.

- **IBM Plex Sans Variable** — prose, labels, navigation. Institutional,
  engineered, humane; it carries technical authority without costume.
- **IBM Plex Mono** — every numeral, the wordmark, code, and any label that
  names a measurement. Monospace here is the subject matter, not decoration:
  this library exists to align digits in columns.
- Display sizes run in Plex Mono at tight tracking (-0.04em floor) so headings
  read as instrument labelling.
- Numerals are tabular everywhere by default.

## Color

Inherits the library's own tokens so the page and the product cannot drift.

| Role | Token |
|---|---|
| page ground | `--site-bg` `#07090e` |
| panel ground | `--card` |
| rules | `--border` |
| accent (interface) | `--primary` |
| direction | `--up` / `--down` — functional only, never decorative |

Direction color is reserved. If something on the page is green, it is because a
number went up.

## Motion

**One authored moment:** on load, the hero terminal "comes alive" — the grid
fades up, hairlines draw, and the feed starts ticking. Everything after that is
the data moving on its own, which is the most honest animation this product has.

Everything else is state feedback only: hover, focus, the price flash, the tape
row entering. Exponential ease-out, from an already-visible default. All of it
yields to `prefers-reduced-motion`.

## Iconography

Lucide, one stroke weight, plus authored SVGs for the brand mark and the empty
states. No emoji, no unicode glyphs standing in for icons.

## Empty and loading states are product

A trading UI is mostly empty before the session opens. Every list component
ships an authored SVG empty state and a structural skeleton that matches the
shape of the thing being loaded — a ladder skeleton looks like a ladder.

## Browser surfaces

Selection, caret, scrollbars, and focus rings are themed from the palette. On an
instrument, nothing is left at the factory default.
