import { useEffect, useMemo, useRef, useState } from 'react';
import { crisp, dashedLine, makeScale, niceTicks, prepareCanvas, readTokens } from '../../canvas';
import { formatAxisTime, formatMoney, formatPercent, formatTime } from '../../format';
import { useElementSize } from '../../hooks';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument } from '../../types';
import { cn } from '../../utils';

export interface EquityPoint {
  time: number;
  /** Account equity at this moment. */
  equity: number;
}

export interface PnlChartProps {
  points: EquityPoint[];
  instrument?: Partial<Instrument>;
  height?: number;
  /** Baseline to measure P&L against. Defaults to the first point. */
  startingEquity?: number;
  /** Shade peak-to-trough drawdown beneath the curve. */
  showDrawdown?: boolean;
  /** Dashed rule at the starting equity. */
  showBaseline?: boolean;
  crosshair?: boolean;
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
  '--muted-foreground',
] as const;

const AXIS_WIDTH = 62;
const TIME_AXIS_HEIGHT = 18;
const PAD = 8;

/** Running maximum, so drawdown is measured from the peak rather than the start. */
function runningPeak(values: number[]): number[] {
  let peak = -Infinity;
  return values.map((v) => (peak = Math.max(peak, v)));
}

/**
 * Equity curve with drawdown.
 *
 * The curve is coloured against the starting equity, but the shaded region is
 * measured from the running peak — those are different questions. "Am I up on
 * the day" and "how far below my high-water mark am I" both matter, and a
 * chart that only answers the first lets a long bleed off a peak look like a
 * healthy green line.
 */
export function PnlChart({
  points,
  instrument,
  height = 220,
  startingEquity,
  showDrawdown = true,
  showBaseline = true,
  crosshair = true,
  className,
}: PnlChartProps) {
  const inst = useInstrument(instrument);
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hover, setHover] = useState<{ index: number; x: number } | null>(null);

  const width = size.width;

  const model = useMemo(() => {
    if (points.length < 2) return null;
    const equity = points.map((p) => p.equity);
    const base = startingEquity ?? equity[0];
    const peaks = runningPeak(equity);
    const maxDrawdown = Math.min(...equity.map((v, i) => (v - peaks[i]) / peaks[i]));
    return {
      base,
      peaks,
      lo: Math.min(...equity, base),
      hi: Math.max(...equity, base),
      last: equity[equity.length - 1],
      maxDrawdown,
    };
  }, [points, startingEquity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !model || width < 2) return;

    const ctx = prepareCanvas(canvas, width, height);
    if (!ctx) return;
    const c = readTokens(wrap, TOKENS);

    const left = PAD;
    const right = width - AXIS_WIDTH;
    const top = PAD;
    const bottom = height - TIME_AXIS_HEIGHT;

    const pad = (model.hi - model.lo) * 0.08 || Math.abs(model.hi) * 0.01 || 1;
    const y = makeScale(model.lo - pad, model.hi + pad, bottom, top);
    const x = makeScale(0, points.length - 1, left, right);

    ctx.font = '10px ui-monospace, monospace';
    ctx.textBaseline = 'middle';

    for (const tick of niceTicks(model.lo - pad, model.hi + pad, 4)) {
      const ty = y(tick);
      if (ty < top - 1 || ty > bottom + 1) continue;
      ctx.strokeStyle = c['--chart-grid'];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, crisp(ty));
      ctx.lineTo(right, crisp(ty));
      ctx.stroke();
      ctx.fillStyle = c['--chart-axis'];
      ctx.textAlign = 'left';
      ctx.fillText(formatMoney(tick, inst.currency, 0), right + 6, ty);
    }

    const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor((right - left) / 70))));
    ctx.textAlign = 'center';
    ctx.fillStyle = c['--chart-axis'];
    for (let i = points.length - 1; i >= 0; i -= labelEvery) {
      ctx.fillText(formatAxisTime(points[i].time), x(i), bottom + TIME_AXIS_HEIGHT / 2);
    }

    const up = model.last >= model.base;
    const stroke = up ? c['--up'] : c['--down'];

    if (showDrawdown) {
      // Between the running peak and the curve: the region is the loss from
      // the high-water mark, which is why it is always drawn in the down tone.
      ctx.beginPath();
      points.forEach((_, i) => {
        const px = x(i);
        const py = y(model.peaks[i]);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      for (let i = points.length - 1; i >= 0; i--) {
        ctx.lineTo(x(i), y(points[i].equity));
      }
      ctx.closePath();
      ctx.fillStyle = c['--down-line'];
      ctx.globalAlpha = 0.22;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (showBaseline) {
      ctx.strokeStyle = c['--chart-crosshair'];
      ctx.lineWidth = 1;
      dashedLine(ctx, left, crisp(y(model.base)), right, crisp(y(model.base)), [3, 4]);
    }

    const fill = ctx.createLinearGradient(0, top, 0, bottom);
    fill.addColorStop(0, up ? c['--up-line'] : c['--down-line']);
    fill.addColorStop(1, 'transparent');
    ctx.save();
    ctx.beginPath();
    points.forEach((p, i) => {
      const px = x(i);
      const py = y(p.equity);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.lineTo(x(points.length - 1), bottom);
    ctx.lineTo(x(0), bottom);
    ctx.closePath();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    points.forEach((p, i) => {
      const px = x(i);
      const py = y(p.equity);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.75;
    ctx.lineJoin = 'round';
    ctx.stroke();

    if (crosshair && hover) {
      const px = x(hover.index);
      ctx.strokeStyle = c['--chart-crosshair'];
      dashedLine(ctx, crisp(px), top, crisp(px), bottom, [3, 3]);
      ctx.fillStyle = stroke;
      ctx.beginPath();
      ctx.arc(px, y(points[hover.index].equity), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [model, points, width, height, showDrawdown, showBaseline, crosshair, hover, inst.currency, wrapRef]);

  if (!model) {
    return <div className="text-muted-foreground p-5 text-center text-xs">Not enough history</div>;
  }

  const hovered = hover ? points[hover.index] : undefined;
  const hoveredPnl = hovered ? hovered.equity - model.base : 0;

  return (
    <div
      ref={wrapRef}
      className={cn('relative w-full', className)}
      style={{ height }}
      onPointerMove={(e) => {
        if (!crosshair) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const inner = Math.max(1, rect.width - AXIS_WIDTH - PAD);
        const index = Math.min(
          points.length - 1,
          Math.max(0, Math.round(((px - PAD) / inner) * (points.length - 1))),
        );
        setHover({ index, x: px });
      }}
      onPointerLeave={() => setHover(null)}
    >
      <canvas ref={canvasRef} className="block size-full" />
      {hovered && hover && (
        <div
          className="bg-popover text-popover-foreground pointer-events-none absolute top-2 z-20 flex flex-col gap-0.5 rounded-md border p-2 font-mono text-[10px] tabular-nums shadow-lg"
          style={{
            left: hover.x > width - 150 ? undefined : hover.x + 12,
            right: hover.x > width - 150 ? width - hover.x + 12 : undefined,
          }}
        >
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{formatTime(hovered.time).slice(0, 5)}</span>
            <span className="font-semibold">{formatMoney(hovered.equity, inst.currency)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">P&amp;L</span>
            <span className={cn('font-semibold', hoveredPnl >= 0 ? 'text-up' : 'text-down')}>
              {formatMoney(hoveredPnl, inst.currency)} {formatPercent(hoveredPnl / model.base)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
