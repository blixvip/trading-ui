import { useEffect, useMemo, useRef, useState } from 'react';
import {
  crisp,
  dashedLine,
  makeScale,
  niceTicks,
  prepareCanvas,
  readTokens,
} from '../../canvas';
import {
  formatAxisTime,
  formatCompact,
  formatPercent,
  formatPrice,
  formatTime,
} from '../../format';
import { useElementSize } from '../../hooks';
import { useInstrument } from '../../theme/theme-provider';
import type { Candle, Instrument } from '../../types';
import { cn } from '../../utils';

export type CandleChartKind = 'candle' | 'hollow' | 'line' | 'area';

export interface MovingAverage {
  /** Lookback in bars. */
  period: number;
  /** Any CSS color, or a token like `var(--primary)`. */
  color?: string;
}

export interface CandleChartProps {
  candles: Candle[];
  instrument?: Partial<Instrument>;
  kind?: CandleChartKind;
  /** Fixed height in px. Omit to fill the parent, which must have a height. */
  height?: number;
  /** Volume histogram pinned to the bottom of the plot. */
  showVolume?: boolean;
  /** Dashed rule and axis tag at the latest close. */
  showLastPrice?: boolean;
  showGrid?: boolean;
  /** Crosshair plus an OHLC readout on hover. */
  crosshair?: boolean;
  /** Simple moving averages drawn over the series. */
  movingAverages?: MovingAverage[];
  /** Fires with the hovered bar, or null on leave - for syncing sibling panes. */
  onHoverCandle?: (candle: Candle | null, index: number) => void;
  className?: string;
}

const TOKENS = [
  '--up',
  '--down',
  '--up-line',
  '--down-line',
  '--chart-grid',
  '--chart-axis',
  '--chart-crosshair',
  '--card',
  '--muted',
  '--muted-foreground',
  '--foreground',
  '--primary',
  '--up-foreground',
  '--down-foreground',
] as const;

/**
 * Overlay colors are deliberately off the direction axis - violet, teal,
 * pink. Anything green, red, blue or amber would collide with `--up` / `--down`
 * in one of the two palettes, and an indicator line that looks like a
 * direction signal is worse than no indicator at all.
 */
const MA_FALLBACK = ['#8b5cf6', '#14b8a6', '#ec4899'];
const AXIS_WIDTH = 58;
const TIME_AXIS_HEIGHT = 20;
const PAD = 8;

/** Simple moving average, `null` until the window is full. */
function sma(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/**
 * OHLC chart on a 2D canvas.
 *
 * Canvas, not SVG: a 240-bar candle chart is roughly a thousand DOM nodes as
 * SVG and re-layouts that whole subtree on every tick, while one canvas
 * repaint costs about the same whether it draws 50 bars or 5,000. The trade-off
 * is that canvas cannot inherit `var(--up)`, so the chart resolves its tokens
 * from the live computed style on each draw and stays theme-accurate anyway.
 */
export function CandleChart({
  candles,
  instrument,
  kind = 'candle',
  height,
  showVolume = true,
  showLastPrice = true,
  showGrid = true,
  crosshair = true,
  movingAverages,
  onHoverCandle,
  className,
}: CandleChartProps) {
  const inst = useInstrument(instrument);
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);

  const width = size.width;
  const chartHeight = height ?? size.height;

  const averages = useMemo(() => {
    if (!movingAverages?.length) return [];
    const closes = candles.map((c) => c.close);
    return movingAverages.map((ma, i) => ({
      ...ma,
      color: ma.color ?? MA_FALLBACK[i % MA_FALLBACK.length],
      values: sma(closes, ma.period),
    }));
  }, [candles, movingAverages]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || width < 2 || chartHeight < 2 || candles.length === 0) return;

    const ctx = prepareCanvas(canvas, width, chartHeight);
    if (!ctx) return;
    const c = readTokens(wrap, TOKENS);

    const plotLeft = PAD;
    const plotRight = width - AXIS_WIDTH;
    const plotWidth = Math.max(1, plotRight - plotLeft);
    const plotTop = PAD;
    const plotBottom = chartHeight - TIME_AXIS_HEIGHT;
    const volumeHeight = showVolume ? Math.max(24, (plotBottom - plotTop) * 0.18) : 0;
    const priceBottom = plotBottom - (volumeHeight ? volumeHeight + 6 : 0);

    let lo = Infinity;
    let hi = -Infinity;
    for (const bar of candles) {
      if (bar.low < lo) lo = bar.low;
      if (bar.high > hi) hi = bar.high;
    }
    for (const ma of averages) {
      for (const v of ma.values) {
        if (v === null) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    // 4% headroom top and bottom so wicks never touch the frame.
    const pad = (hi - lo) * 0.04 || hi * 0.004 || 1;
    const y = makeScale(lo - pad, hi + pad, priceBottom, plotTop);

    const slot = plotWidth / candles.length;
    const bodyWidth = Math.max(1, Math.min(14, slot * 0.68));
    const xOf = (i: number) => plotLeft + slot * (i + 0.5);

    ctx.font = '10px ui-monospace, monospace';
    ctx.textBaseline = 'middle';

    // --- grid + price axis ---
    const lastBar = candles[candles.length - 1];
    const lastY = y(lastBar.close);
    const ticks = niceTicks(
      lo - pad,
      hi + pad,
      Math.max(2, Math.floor((priceBottom - plotTop) / 46)),
    );
    for (const tick of ticks) {
      const ty = y(tick);
      if (ty < plotTop - 1 || ty > priceBottom + 1) continue;
      if (showGrid) {
        ctx.strokeStyle = c['--chart-grid'];
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plotLeft, crisp(ty));
        ctx.lineTo(plotRight, crisp(ty));
        ctx.stroke();
      }
      // The last-price tag is painted over this axis later; drop any label it
      // would land on rather than stacking two numbers in the same place.
      if (showLastPrice && Math.abs(ty - lastY) < 11) continue;
      ctx.fillStyle = c['--chart-axis'];
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(tick, inst.pricePrecision), plotRight + 6, ty);
    }

    // --- time axis ---
    const labelEvery = Math.max(1, Math.ceil(candles.length / Math.max(1, Math.floor(plotWidth / 64))));
    ctx.textAlign = 'center';
    ctx.fillStyle = c['--chart-axis'];
    for (let i = candles.length - 1; i >= 0; i -= labelEvery) {
      const bar = candles[i];
      const prev = candles[i - labelEvery];
      const newDay = prev ? new Date(prev.time).getDate() !== new Date(bar.time).getDate() : false;
      ctx.fillText(formatAxisTime(bar.time, newDay), xOf(i), plotBottom + TIME_AXIS_HEIGHT / 2);
    }
    ctx.strokeStyle = c['--chart-grid'];
    ctx.beginPath();
    ctx.moveTo(plotLeft, crisp(plotBottom));
    ctx.lineTo(plotRight, crisp(plotBottom));
    ctx.stroke();

    // --- volume ---
    if (volumeHeight > 0) {
      let maxVolume = 0;
      for (const bar of candles) if (bar.volume > maxVolume) maxVolume = bar.volume;
      for (let i = 0; i < candles.length; i++) {
        const bar = candles[i];
        const h = maxVolume ? (bar.volume / maxVolume) * volumeHeight : 0;
        ctx.fillStyle = bar.close >= bar.open ? c['--up-line'] : c['--down-line'];
        ctx.globalAlpha = 0.5;
        ctx.fillRect(xOf(i) - bodyWidth / 2, plotBottom - h, bodyWidth, h);
      }
      ctx.globalAlpha = 1;
    }

    // --- price series ---
    const tracePath = () => {
      ctx.beginPath();
      for (let i = 0; i < candles.length; i++) {
        const px = xOf(i);
        const py = y(candles[i].close);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    };

    if (kind === 'candle' || kind === 'hollow') {
      for (let i = 0; i < candles.length; i++) {
        const bar = candles[i];
        const up = bar.close >= bar.open;
        const color = up ? c['--up'] : c['--down'];
        const cx = xOf(i);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(crisp(cx), y(bar.high));
        ctx.lineTo(crisp(cx), y(bar.low));
        ctx.stroke();

        const openY = y(bar.open);
        const closeY = y(bar.close);
        const top = Math.min(openY, closeY);
        // A doji still needs a visible 1px body.
        const bodyHeight = Math.max(1, Math.abs(closeY - openY));

        if (kind === 'hollow' && up) {
          ctx.strokeRect(
            crisp(cx - bodyWidth / 2),
            crisp(top),
            Math.round(bodyWidth),
            Math.round(bodyHeight),
          );
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(cx - bodyWidth / 2, top, bodyWidth, bodyHeight);
        }
      }
    } else {
      const up = lastBar.close >= candles[0].open;
      const line = up ? c['--up'] : c['--down'];

      if (kind === 'area') {
        const gradient = ctx.createLinearGradient(0, plotTop, 0, priceBottom);
        gradient.addColorStop(0, up ? c['--up-line'] : c['--down-line']);
        gradient.addColorStop(1, 'transparent');
        ctx.save();
        tracePath();
        ctx.lineTo(xOf(candles.length - 1), priceBottom);
        ctx.lineTo(xOf(0), priceBottom);
        ctx.closePath();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
      }

      // Re-trace: an area fill closes the path back along the baseline, which
      // would otherwise be stroked as part of the line.
      tracePath();
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // --- moving averages ---
    for (const ma of averages) {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < ma.values.length; i++) {
        const v = ma.values[i];
        if (v === null) continue;
        const px = xOf(i);
        const py = y(v);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      if (!started) continue;
      ctx.strokeStyle = ma.color.startsWith('var(')
        ? readTokens(wrap, [ma.color.slice(4, -1) as '--primary'])[
            ma.color.slice(4, -1) as '--primary'
          ]
        : ma.color;
      ctx.lineWidth = 1.25;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // --- last price ---
    if (showLastPrice) {
      const prior = candles.length > 1 ? candles[candles.length - 2].close : lastBar.open;
      const up = lastBar.close >= prior;
      ctx.strokeStyle = up ? c['--up'] : c['--down'];
      ctx.lineWidth = 1;
      dashedLine(ctx, plotLeft, crisp(lastY), plotRight, crisp(lastY), [4, 4]);

      ctx.fillStyle = up ? c['--up'] : c['--down'];
      ctx.fillRect(plotRight + 2, lastY - 8, AXIS_WIDTH - 4, 16);
      ctx.fillStyle = up ? c['--up-foreground'] : c['--down-foreground'];
      ctx.textAlign = 'center';
      ctx.fillText(
        formatPrice(lastBar.close, inst.pricePrecision),
        plotRight + 2 + (AXIS_WIDTH - 4) / 2,
        lastY,
      );
    }

    // --- crosshair ---
    if (crosshair && hover && candles[hover.index]) {
      const cx = xOf(hover.index);
      ctx.strokeStyle = c['--chart-crosshair'];
      ctx.lineWidth = 1;
      dashedLine(ctx, crisp(cx), plotTop, crisp(cx), plotBottom, [3, 3]);
      const hy = Math.min(Math.max(hover.y, plotTop), priceBottom);
      dashedLine(ctx, plotLeft, crisp(hy), plotRight, crisp(hy), [3, 3]);

      ctx.fillStyle = c['--muted'];
      ctx.fillRect(plotRight + 2, hy - 8, AXIS_WIDTH - 4, 16);
      ctx.fillStyle = c['--muted-foreground'];
      ctx.textAlign = 'center';
      ctx.fillText(
        formatPrice(y.invert(hy), inst.pricePrecision),
        plotRight + 2 + (AXIS_WIDTH - 4) / 2,
        hy,
      );
    }
  }, [
    candles,
    averages,
    width,
    chartHeight,
    kind,
    showVolume,
    showLastPrice,
    showGrid,
    crosshair,
    hover,
    inst.pricePrecision,
    wrapRef,
  ]);

  const hovered = hover ? candles[hover.index] : undefined;

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!crosshair || candles.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const plotWidth = Math.max(1, rect.width - AXIS_WIDTH - PAD);
    const slot = plotWidth / candles.length;
    const index = Math.min(candles.length - 1, Math.max(0, Math.floor((x - PAD) / slot)));
    setHover({ index, x, y: e.clientY - rect.top });
    onHoverCandle?.(candles[index] ?? null, index);
  };

  const clearHover = () => {
    setHover(null);
    onHoverCandle?.(null, -1);
  };

  // The readout flips to the left of the cursor near the right edge so it is
  // never clipped by the panel.
  const flip = hover ? hover.x > width - 170 : false;

  return (
    <div
      ref={wrapRef}
      className={cn('relative min-h-0 w-full', className)}
      style={{ height: height ?? '100%' }}
      onPointerMove={handleMove}
      onPointerLeave={clearHover}
    >
      <canvas ref={canvasRef} className="block size-full" />
      {hovered && hover && (
        <div
          className="bg-popover text-popover-foreground pointer-events-none absolute z-20 flex flex-col gap-0.5 rounded-md border p-2 font-mono text-[10px] tabular-nums shadow-lg"
          style={{
            left: flip ? undefined : hover.x + 12,
            right: flip ? width - hover.x + 12 : undefined,
            top: Math.min(hover.y + 12, Math.max(0, chartHeight - 96)),
          }}
        >
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{formatTime(hovered.time).slice(0, 5)}</span>
            <span
              className={cn('font-semibold', hovered.close >= hovered.open ? 'text-up' : 'text-down')}
            >
              {formatPercent((hovered.close - hovered.open) / hovered.open)}
            </span>
          </div>
          {(['open', 'high', 'low', 'close'] as const).map((key) => (
            <div className="flex justify-between gap-4" key={key}>
              <span className="text-muted-foreground">{key[0].toUpperCase()}</span>
              <span className="font-semibold">
                {formatPrice(hovered[key], inst.pricePrecision)}
              </span>
            </div>
          ))}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Vol</span>
            <span className="font-semibold">{formatCompact(hovered.volume)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
