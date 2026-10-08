'use client';

import { useEffect, useMemo, useRef } from 'react';
import { crisp, makeScale, prepareCanvas, readTokens } from '../../canvas';
import { useElementSize } from '../../hooks';
import type { Candle } from '../../types';
import { cn, toArray } from '../../utils';

export type IndicatorKind = 'rsi' | 'macd' | 'volume';

export interface IndicatorPaneProps {
  candles: Candle[];
  kind?: IndicatorKind;
  /** RSI lookback, or the MACD signal period. */
  period?: number;
  /** MACD fast EMA. */
  fastPeriod?: number;
  /** MACD slow EMA. */
  slowPeriod?: number;
  height?: number;
  /** RSI only: the oversold / overbought rules drawn behind the line. */
  bands?: [number, number];
  className?: string;
  'aria-label'?: string;
}

const TOKENS = [
  '--up',
  '--down',
  '--chart-grid',
  '--chart-axis',
  '--muted-foreground',
  '--primary',
  '--foreground',
] as const;

const AXIS_WIDTH = 34;
const PAD = 6;

/** Wilder's RSI. `null` until the lookback is satisfied. */
export function rsi(closes: readonly number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (period < 1 || closes.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gain += change;
    else loss -= change;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);

  // Wilder smoothing, not a rolling mean. The two disagree, and every desk and
  // charting package quotes the smoothed one.
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(0, change)) / period;
    loss = (loss * (period - 1) + Math.max(0, -change)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

/** Exponential moving average, seeded with a simple mean over the first window. */
export function ema(values: readonly number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period < 1 || values.length < period) return out;
  const k = 2 / (period + 1);
  let acc = 0;
  for (let i = 0; i < period; i++) acc += values[i];
  let prev = acc / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export interface MacdPoint {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

/** MACD line, its signal EMA, and the histogram between them. */
export function macd(
  closes: readonly number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdPoint[] {
  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, slowPeriod);
  const line = closes.map((_, i) => {
    const f = fast[i];
    const s = slow[i];
    return f === null || s === null ? null : f - s;
  });

  // The signal EMA is seeded only from the bars where the MACD line exists.
  // Treating the leading nulls as zeroes drags the first signal values toward
  // the axis and prints a crossover that never happened.
  const defined = line.filter((v): v is number => v !== null);
  const signalTail = ema(defined, signalPeriod);
  const offset = line.length - defined.length;

  return line.map((value, i) => {
    const signal = i >= offset ? signalTail[i - offset] : null;
    return {
      macd: value,
      signal: signal ?? null,
      histogram: value !== null && signal != null ? value - signal : null,
    };
  });
}

/**
 * The sub-pane under a price chart: RSI, MACD or volume.
 *
 * Kept separate from `CandleChart` rather than bolted onto it, because an
 * oscillator has its own domain - RSI is 0-100, MACD straddles zero, volume is
 * unbounded - and folding them into the price scale is what makes a chart
 * unreadable. Share the x-axis by handing both components the same candles at
 * the same width.
 */
export function IndicatorPane({
  candles,
  kind = 'rsi',
  period = 14,
  fastPeriod = 12,
  slowPeriod = 26,
  height = 92,
  bands = [30, 70],
  className,
  'aria-label': ariaLabel,
}: IndicatorPaneProps) {
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bars = toArray(candles);
  const width = size.width;

  const series = useMemo(() => {
    const closes = bars.map((c) => c.close);
    if (kind === 'rsi') return { rsi: rsi(closes, period) };
    if (kind === 'macd') return { macd: macd(closes, fastPeriod, slowPeriod) };
    return { volume: bars.map((c) => c.volume) };
  }, [bars, kind, period, fastPeriod, slowPeriod]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || width < 2 || height < 2 || bars.length === 0) return;

    const ctx = prepareCanvas(canvas, width, height);
    if (!ctx) return;
    const c = readTokens(wrap, TOKENS);

    const left = PAD;
    const right = width - AXIS_WIDTH;
    const top = PAD;
    const bottom = height - PAD;
    const plotWidth = Math.max(1, right - left);
    const slot = plotWidth / bars.length;
    const xOf = (i: number) => left + i * slot + slot / 2;

    ctx.font = '10px ui-monospace, monospace';
    ctx.textBaseline = 'middle';

    const axisLabel = (text: string, py: number) => {
      ctx.fillStyle = c['--muted-foreground'];
      ctx.textAlign = 'left';
      ctx.fillText(text, right + 4, py);
    };

    const polyline = (
      values: readonly (number | null)[],
      y: (v: number) => number,
      color: string,
      dash: number[] = [],
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.setLineDash(dash);
      ctx.beginPath();
      let started = false;
      values.forEach((value, i) => {
        if (value === null) return;
        const px = xOf(i);
        const py = y(value);
        if (started) ctx.lineTo(px, py);
        else {
          ctx.moveTo(px, py);
          started = true;
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (kind === 'rsi') {
      const y = makeScale(0, 100, bottom, top);
      const [low, high] = bands;

      // Shade between the rules rather than only drawing them: "is it in the
      // middle" is the question this pane gets read for.
      ctx.fillStyle = c['--chart-grid'];
      ctx.globalAlpha = 0.35;
      ctx.fillRect(left, y(high), plotWidth, y(low) - y(high));
      ctx.globalAlpha = 1;

      ctx.strokeStyle = c['--chart-grid'];
      ctx.lineWidth = 1;
      for (const level of [low, 50, high]) {
        ctx.beginPath();
        ctx.moveTo(left, crisp(y(level)));
        ctx.lineTo(right, crisp(y(level)));
        ctx.stroke();
      }
      axisLabel(String(high), y(high));
      axisLabel(String(low), y(low));

      const values = series.rsi ?? [];
      let last: number | null = null;
      for (let i = values.length - 1; i >= 0; i--) {
        if (values[i] !== null) {
          last = values[i];
          break;
        }
      }
      const stroke =
        last === null
          ? c['--primary']
          : last >= high
            ? c['--down']
            : last <= low
              ? c['--up']
              : c['--primary'];
      polyline(values, y, stroke);
    }

    if (kind === 'macd') {
      const points = series.macd ?? [];
      let extreme = 0;
      for (const p of points) {
        for (const v of [p.macd, p.signal, p.histogram]) {
          if (v === null) continue;
          if (Math.abs(v) > extreme) extreme = Math.abs(v);
        }
      }
      // Symmetric around zero: a MACD pane whose zero line drifts off-centre
      // misreports the sign of the move at a glance.
      const span = extreme || 1;
      const y = makeScale(-span, span, bottom, top);

      ctx.strokeStyle = c['--chart-axis'];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, crisp(y(0)));
      ctx.lineTo(right, crisp(y(0)));
      ctx.stroke();

      const barWidth = Math.max(1, slot * 0.6);
      const zero = y(0);
      ctx.globalAlpha = 0.55;
      points.forEach((p, i) => {
        if (p.histogram === null) return;
        ctx.fillStyle = p.histogram >= 0 ? c['--up'] : c['--down'];
        const py = y(p.histogram);
        ctx.fillRect(xOf(i) - barWidth / 2, Math.min(zero, py), barWidth, Math.abs(py - zero));
      });
      ctx.globalAlpha = 1;

      polyline(
        points.map((p) => p.macd),
        y,
        c['--primary'],
      );
      polyline(
        points.map((p) => p.signal),
        y,
        c['--muted-foreground'],
        [3, 2],
      );
      axisLabel('0', zero);
    }

    if (kind === 'volume') {
      const values = series.volume ?? [];
      const peak = Math.max(1, ...values);
      const y = makeScale(0, peak, bottom, top);
      const barWidth = Math.max(1, slot * 0.6);
      ctx.globalAlpha = 0.6;
      values.forEach((value, i) => {
        const bar = bars[i];
        ctx.fillStyle = bar.close >= bar.open ? c['--up'] : c['--down'];
        ctx.fillRect(xOf(i) - barWidth / 2, y(value), barWidth, bottom - y(value));
      });
      ctx.globalAlpha = 1;
    }
  }, [series, bars, kind, bands, width, height, wrapRef]);

  const title =
    kind === 'rsi' ? `RSI ${period}` : kind === 'macd' ? `MACD ${fastPeriod}/${slowPeriod}` : 'Volume';

  return (
    <div
      ref={wrapRef}
      data-slot="indicator-pane"
      className={cn('relative w-full', className)}
      style={{ height }}
      role="img"
      aria-label={ariaLabel ?? title}
    >
      <span className="text-muted-foreground pointer-events-none absolute top-1 left-2 z-10 text-[10px] font-medium tracking-wide uppercase">
        {title}
      </span>
      <canvas ref={canvasRef} className="block h-full w-full" style={{ width, height }} />
    </div>
  );
}
