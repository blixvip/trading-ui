import { useEffect, useMemo, useRef, useState } from 'react';
import { crisp, makeScale, niceTicks, prepareCanvas, readTokens } from '../../canvas';
import { formatCompact, formatPrice } from '../../format';
import { useElementSize } from '../../hooks';
import { useInstrument } from '../../theme/theme-provider';
import type { Instrument, OrderBookSnapshot } from '../../types';
import { cn } from '../../utils';

export interface DepthChartProps {
  book: OrderBookSnapshot;
  instrument?: Partial<Instrument>;
  height?: number;
  /** Half-width of the price window, as a fraction of mid (0.004 = +/-0.4%). */
  range?: number;
  /** Mid-price rule. */
  showMid?: boolean;
  crosshair?: boolean;
  className?: string;
}

const TOKENS = [
  '--up',
  '--down',
  '--up-muted',
  '--down-muted',
  '--chart-grid',
  '--chart-axis',
  '--chart-crosshair',
] as const;

const AXIS_HEIGHT = 18;
const PAD = 6;

/**
 * Cumulative depth, bids mirrored against asks.
 *
 * The y axis is cumulative resting size, so the height of a wall answers the
 * question the chart exists for: how much has to trade to push price there.
 * Drawn as steps, never a smoothed curve - liquidity sits at discrete ticks,
 * and interpolating between them invents book that is not on the exchange.
 */
export function DepthChart({
  book,
  instrument,
  height = 160,
  range = 0.004,
  showMid = true,
  crosshair = true,
  className,
}: DepthChartProps) {
  const inst = useInstrument(instrument);
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const model = useMemo(() => {
    const bestBid = book.bids[0]?.price;
    const bestAsk = book.asks[0]?.price;
    if (bestBid === undefined || bestAsk === undefined) return null;

    const mid = (bestBid + bestAsk) / 2;
    const lo = mid * (1 - range);
    const hi = mid * (1 + range);

    const cumulate = (levels: { price: number; size: number }[]) => {
      let total = 0;
      return levels
        .filter((l) => l.price >= lo && l.price <= hi)
        .map((l) => ({ price: l.price, total: (total += l.size) }));
    };

    const bids = cumulate(book.bids);
    const asks = cumulate(book.asks);
    const maxTotal = Math.max(
      bids[bids.length - 1]?.total ?? 0,
      asks[asks.length - 1]?.total ?? 0,
      1,
    );

    return { mid, lo, hi, bids, asks, maxTotal };
  }, [book, range]);

  const width = size.width;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !model || width < 2) return;

    const ctx = prepareCanvas(canvas, width, height);
    if (!ctx) return;
    const c = readTokens(wrap, TOKENS);

    const plotTop = PAD;
    const plotBottom = height - AXIS_HEIGHT;
    const x = makeScale(model.lo, model.hi, PAD, width - PAD);
    const y = makeScale(0, model.maxTotal * 1.08, plotBottom, plotTop);

    ctx.font = '10px ui-monospace, monospace';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = c['--chart-grid'];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, crisp(plotBottom));
    ctx.lineTo(width - PAD, crisp(plotBottom));
    ctx.stroke();

    ctx.fillStyle = c['--chart-axis'];
    ctx.textAlign = 'center';
    for (const tick of niceTicks(model.lo, model.hi, 4)) {
      const tx = x(tick);
      if (tx < PAD + 12 || tx > width - PAD - 12) continue;
      ctx.fillText(formatPrice(tick, inst.pricePrecision), tx, plotBottom + AXIS_HEIGHT / 2);
    }

    /** Step-fills one side outward from the mid. */
    const drawSide = (
      levels: { price: number; total: number }[],
      stroke: string,
      fill: string,
      toRight: boolean,
    ) => {
      if (levels.length === 0) return;
      const startX = x(model.mid);

      ctx.beginPath();
      ctx.moveTo(startX, plotBottom);
      let prevY = y(levels[0].total);
      ctx.lineTo(startX, prevY);
      for (const level of levels) {
        const lx = x(level.price);
        const ly = y(level.total);
        ctx.lineTo(lx, prevY);
        ctx.lineTo(lx, ly);
        prevY = ly;
      }
      const edgeX = toRight ? width - PAD : PAD;
      ctx.lineTo(edgeX, prevY);
      ctx.lineTo(edgeX, plotBottom);
      ctx.closePath();

      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    drawSide(model.bids, c['--up'], c['--up-muted'], false);
    drawSide(model.asks, c['--down'], c['--down-muted'], true);

    if (showMid) {
      ctx.strokeStyle = c['--chart-crosshair'];
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(crisp(x(model.mid)), plotTop);
      ctx.lineTo(crisp(x(model.mid)), plotBottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (crosshair && hover) {
      ctx.strokeStyle = c['--chart-crosshair'];
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(crisp(hover.x), plotTop);
      ctx.lineTo(crisp(hover.x), plotBottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [model, width, height, showMid, crosshair, hover, inst.pricePrecision, wrapRef]);

  // Reads cumulative size at the cursor, on whichever side it is hovering.
  const readout = useMemo(() => {
    if (!model || !hover || width < 2) return null;
    const x = makeScale(model.lo, model.hi, PAD, width - PAD);
    const price = x.invert(hover.x);
    const side = price <= model.mid ? 'bid' : 'ask';
    const levels = side === 'bid' ? model.bids : model.asks;
    let total = 0;
    for (const level of levels) {
      const reached = side === 'bid' ? level.price >= price : level.price <= price;
      if (reached) total = level.total;
    }
    return { price, side, total };
  }, [model, hover, width]);

  return (
    <div
      ref={wrapRef}
      className={cn('relative min-h-0 w-full', className)}
      style={{ height }}
      onPointerMove={(e) => {
        if (!crosshair) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onPointerLeave={() => setHover(null)}
    >
      <canvas ref={canvasRef} className="block size-full" />
      {readout && hover && (
        <div
          className="bg-popover text-popover-foreground pointer-events-none absolute top-2 z-20 flex flex-col gap-0.5 rounded-md border p-2 font-mono text-[10px] tabular-nums shadow-lg"
          style={{
            left: hover.x > width - 150 ? undefined : hover.x + 12,
            right: hover.x > width - 150 ? width - hover.x + 12 : undefined,
          }}
        >
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Price</span>
            <span className="font-semibold">
              {formatPrice(readout.price, inst.pricePrecision)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {readout.side === 'bid' ? 'Cum. bids' : 'Cum. asks'}
            </span>
            <span
              className={cn('font-semibold', readout.side === 'bid' ? 'text-up' : 'text-down')}
            >
              {formatCompact(readout.total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
