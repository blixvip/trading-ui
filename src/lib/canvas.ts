/** Canvas plumbing shared by the chart components. */

export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Sizes the backing store to the device pixel ratio and returns a context
 * already scaled to CSS pixels, so drawing code can use layout units and still
 * get crisp 1px gridlines on a HiDPI screen.
 */
export function prepareCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D | null {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.floor(width * dpr));
  const h = Math.max(1, Math.floor(height * dpr));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return ctx;
}

/**
 * Resolves CSS custom properties against a live element. The charts paint on
 * canvas, which cannot inherit `var(--tu-up)`, so they read the tokens once
 * per draw and stay in sync with whatever theme the host applied.
 */
export function readTokens<K extends string>(
  el: Element,
  names: readonly K[],
): Record<K, string> {
  const style = getComputedStyle(el);
  const out = {} as Record<K, string>;
  for (const name of names) {
    out[name] = style.getPropertyValue(name).trim() || '#888';
  }
  return out;
}

/** Linear scale from a data domain to a pixel range. */
export function makeScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
) {
  const span = domainMax - domainMin || 1;
  const pixels = rangeMax - rangeMin;
  const scale = (value: number) => rangeMin + ((value - domainMin) / span) * pixels;
  scale.invert = (pixel: number) => domainMin + ((pixel - rangeMin) / pixels) * span;
  return scale;
}

/**
 * "Nice" tick values at human-readable intervals (1, 2, 5 x 10^n) so the price
 * axis reads 42.50 / 43.00 / 43.50 instead of 42.37 / 42.91 / 43.45.
 */
export function niceTicks(min: number, max: number, target = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min];
  const raw = (max - min) / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const step =
    (normalized >= 5 ? 10 : normalized >= 2 ? 5 : normalized >= 1 ? 2 : 1) * magnitude;

  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-6; t += step) {
    ticks.push(Number(t.toFixed(10)));
  }
  return ticks;
}

/** Snaps a coordinate to a half-pixel so a 1px stroke lands on one pixel row. */
export function crisp(value: number): number {
  return Math.round(value) + 0.5;
}

/** Fills a rounded rect; `ctx.roundRect` is still patchy in older Safari. */
export function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();
}

/** Dashed horizontal rule used for the last-price and crosshair lines. */
export function dashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number[] = [3, 3],
) {
  ctx.save();
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}
