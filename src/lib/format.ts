import type { Direction } from './types';

/**
 * Formatting helpers. Every number shown in a trading UI is formatted the same
 * way twice: fixed decimals so digits line up in a tabular-nums column, and an
 * explicit sign where direction matters.
 */

const cache = new Map<string, Intl.NumberFormat>();

function nf(min: number, max: number, extra?: Intl.NumberFormatOptions) {
  const key = `${min}:${max}:${extra ? JSON.stringify(extra) : ''}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
      ...extra,
    });
    cache.set(key, f);
  }
  return f;
}

/** `1234.5` at precision 2 -> `"1,234.50"`. */
export function formatPrice(value: number, precision = 2): string {
  if (!Number.isFinite(value)) return '--';
  return nf(precision, precision).format(value);
}

/** Quantity: grouped, trailing zeros trimmed. */
export function formatQuantity(value: number, precision = 0): string {
  if (!Number.isFinite(value)) return '--';
  return nf(0, precision).format(value);
}

/** `1250000` -> `"1.25M"`. Keeps size columns to four glyphs. */
export function formatCompact(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '--';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const units: Array<[number, string]> = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [scale, suffix] of units) {
    if (abs >= scale) {
      const scaled = abs / scale;
      // Keep three significant digits: 1.25M, 12.5M, 125M.
      const d = scaled >= 100 ? 0 : scaled >= 10 ? 1 : digits;
      return `${sign}${nf(0, d).format(scaled)}${suffix}`;
    }
  }
  return `${sign}${nf(0, abs < 1 ? digits : 0).format(abs)}`;
}

/** `0.0421` -> `"+4.21%"`. Input is a ratio, not percentage points. */
export function formatPercent(ratio: number, precision = 2, signed = true): string {
  if (!Number.isFinite(ratio)) return '--';
  const pct = ratio * 100;
  const sign = signed && pct > 0 ? '+' : '';
  return `${sign}${nf(precision, precision).format(pct)}%`;
}

/** Absolute change with a forced sign so gains and losses align. */
export function formatSigned(value: number, precision = 2): string {
  if (!Number.isFinite(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${nf(precision, precision).format(value)}`;
}

/** `hh:mm:ss` in local time - the tape's only useful resolution. */
export function formatTime(time: number | Date, withMillis = false): string {
  const d = time instanceof Date ? time : new Date(time);
  const base = d.toTimeString().slice(0, 8);
  if (!withMillis) return base;
  return `${base}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

/** Axis-friendly timestamp: drops seconds, adds the date when it changes. */
export function formatAxisTime(time: number, showDate = false): string {
  const d = new Date(time);
  const hhmm = d.toTimeString().slice(0, 5);
  if (!showDate) return hhmm;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Signed money, e.g. `-$1,204.50`. */
export function formatMoney(value: number, currency = '$', precision = 2): string {
  if (!Number.isFinite(value)) return '--';
  const sign = value < 0 ? '-' : '';
  return `${sign}${currency}${nf(precision, precision).format(Math.abs(value))}`;
}

/** Direction of `value` relative to `reference` (default zero). */
export function directionOf(value: number, reference = 0): Direction {
  if (!Number.isFinite(value) || value === reference) return 'flat';
  return value > reference ? 'up' : 'down';
}

/** The `tu-up` / `tu-down` / `tu-flat` class for a direction. */
export function directionClass(direction: Direction): string {
  return `tu-${direction}`;
}

/** `+` / `-` glyphs used by DeltaBadge and the tape. */
export function directionArrow(direction: Direction): string {
  return direction === 'up' ? '▲' : direction === 'down' ? '▼' : '–';
}

/** Round to the instrument's tick so UI-entered prices are always valid. */
export function roundToTick(price: number, tickSize: number): number {
  if (!tickSize || tickSize <= 0) return price;
  const ticks = Math.round(price / tickSize);
  // Re-round after dividing to shake off float dust (0.1 * 3 = 0.30000000000000004).
  const decimals = decimalsOf(tickSize);
  return Number((ticks * tickSize).toFixed(decimals));
}

/** Decimal places implied by a tick size: `0.01` -> 2, `0.5` -> 1, `5` -> 0. */
export function decimalsOf(tickSize: number): number {
  if (!Number.isFinite(tickSize) || tickSize <= 0) return 2;
  const s = tickSize.toString();
  if (s.includes('e-')) return Number(s.split('e-')[1]);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}
