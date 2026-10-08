import { useMemo } from 'react';
import { formatPercent } from '../../format';
import type { Quote } from '../../types';
import { cn } from '../../utils';

export interface HeatmapItem {
  symbol: string;
  /** Change as a ratio. Drives the colour. */
  change: number;
  /** Relative area — market cap, volume, or position size. */
  weight: number;
  group?: string;
}

export interface MarketHeatmapProps {
  items: HeatmapItem[];
  height?: number;
  /** Change magnitude that saturates the colour. Defaults to 3%. */
  saturateAt?: number;
  onSelect?: (item: HeatmapItem) => void;
  className?: string;
}

export function quotesToHeatmap(quotes: Quote[]): HeatmapItem[] {
  return quotes.map((q) => ({
    symbol: q.symbol,
    change: (q.last - q.prevClose) / q.prevClose,
    weight: q.volume ?? 1,
  }));
}

interface Tile extends HeatmapItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Squarified treemap: tiles sized by weight, coloured by direction.
 *
 * Squarified rather than a simple slice-and-dice, because strip layouts
 * degenerate into unreadable slivers as soon as one constituent dominates — and
 * in any real market one always does.
 */
function squarify(items: HeatmapItem[], width: number, height: number): Tile[] {
  const sorted = [...items].filter((i) => i.weight > 0).sort((a, b) => b.weight - a.weight);
  const total = sorted.reduce((sum, i) => sum + i.weight, 0);
  if (!total) return [];

  const scale = (width * height) / total;
  const out: Tile[] = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let row: HeatmapItem[] = [];

  const worst = (candidate: HeatmapItem[], side: number) => {
    const areas = candidate.map((i) => i.weight * scale);
    const sum = areas.reduce((a, b) => a + b, 0);
    const max = Math.max(...areas);
    const min = Math.min(...areas);
    const side2 = side * side;
    const sum2 = sum * sum;
    return Math.max((side2 * max) / sum2, sum2 / (side2 * min));
  };

  const flush = () => {
    const side = Math.min(w, h);
    const areas = row.map((i) => i.weight * scale);
    const sum = areas.reduce((a, b) => a + b, 0);
    const thickness = sum / side;
    let offset = 0;
    for (let i = 0; i < row.length; i++) {
      const length = areas[i] / thickness;
      if (w >= h) {
        out.push({ ...row[i], x, y: y + offset, w: thickness, h: length });
      } else {
        out.push({ ...row[i], x: x + offset, y, w: length, h: thickness });
      }
      offset += length;
    }
    if (w >= h) {
      x += thickness;
      w -= thickness;
    } else {
      y += thickness;
      h -= thickness;
    }
    row = [];
  };

  for (const item of sorted) {
    const side = Math.min(w, h);
    if (row.length === 0) {
      row.push(item);
      continue;
    }
    if (worst([...row, item], side) <= worst(row, side)) {
      row.push(item);
    } else {
      flush();
      row.push(item);
    }
  }
  if (row.length) flush();

  return out;
}

/** Market or portfolio overview: area is size, colour is direction. */
export function MarketHeatmap({
  items,
  height = 280,
  saturateAt = 0.03,
  onSelect,
  className,
}: MarketHeatmapProps) {
  // Laid out in a 100x100 space and projected with percentages, so the tiling
  // is resolution-independent and needs no measurement pass.
  const tiles = useMemo(() => squarify(items, 100, 100), [items]);

  if (tiles.length === 0) {
    return <div className="text-muted-foreground p-5 text-center text-xs">Nothing to map</div>;
  }

  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      {tiles.map((tile) => {
        const magnitude = Math.min(1, Math.abs(tile.change) / saturateAt);
        const up = tile.change >= 0;
        // Floor the alpha so a flat constituent is still a visible tile rather
        // than a hole in the map.
        const alpha = 0.12 + magnitude * 0.62;
        const compact = tile.w < 11 || tile.h < 9;
        return (
          <button
            key={tile.symbol}
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(tile)}
            title={`${tile.symbol} ${formatPercent(tile.change)}`}
            aria-label={`${tile.symbol}, ${formatPercent(tile.change)}`}
            className={cn(
              'border-card absolute flex flex-col items-center justify-center overflow-hidden border',
              'focus-visible:ring-ring outline-none focus-visible:z-10 focus-visible:ring-2',
              onSelect && 'hover:z-10 hover:brightness-125',
            )}
            style={{
              left: `${tile.x}%`,
              top: `${tile.y}%`,
              width: `${tile.w}%`,
              height: `${tile.h}%`,
              background: up
                ? `color-mix(in oklab, var(--up) ${alpha * 100}%, var(--card))`
                : `color-mix(in oklab, var(--down) ${alpha * 100}%, var(--card))`,
            }}
          >
            <span
              className={cn(
                'leading-none font-semibold tracking-tight',
                compact ? 'text-[9px]' : 'text-xs',
              )}
            >
              {tile.symbol}
            </span>
            {!compact && (
              <span className="mt-0.5 font-mono text-[10px] leading-none tabular-nums opacity-85">
                {formatPercent(tile.change)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
