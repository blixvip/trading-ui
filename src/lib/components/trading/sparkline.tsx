import { useId, useMemo } from 'react';
import { cn } from '../../utils';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Reference level. Direction coloring and the optional rule use it. */
  baseline?: number;
  strokeWidth?: number;
  /** Gradient fill under the line. */
  area?: boolean;
  /** Dashed rule at the baseline. */
  showBaseline?: boolean;
  /** Dot on the final point. */
  markLast?: boolean;
  /** Force a color instead of deriving it from last-vs-baseline. */
  color?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Inline trend line.
 *
 * SVG rather than canvas: these appear dozens at a time in a watchlist, where
 * one canvas context per row is wasteful, SVG scales for free, and the line
 * stays crisp at any device pixel ratio without a redraw.
 */
export function Sparkline({
  data,
  width = 72,
  height = 22,
  baseline,
  strokeWidth = 1.25,
  area = true,
  showBaseline = false,
  markLast = false,
  color,
  className,
  ...aria
}: SparklineProps) {
  const gradientId = useId();

  const geometry = useMemo(() => {
    const points = data.filter(Number.isFinite);
    if (points.length < 2) return null;

    const base = baseline ?? points[0];
    let min = Math.min(...points);
    let max = Math.max(...points);
    // Keep the baseline inside the viewport so the fill reads correctly.
    if (showBaseline || baseline !== undefined) {
      min = Math.min(min, base);
      max = Math.max(max, base);
    }
    const span = max - min || Math.abs(max) * 0.01 || 1;
    const pad = strokeWidth + (markLast ? 2 : 0);
    const innerH = Math.max(1, height - pad * 2);

    const x = (i: number) => (i / (points.length - 1)) * width;
    const y = (v: number) => pad + innerH - ((v - min) / span) * innerH;

    const line = points.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
    const last = points[points.length - 1];

    return {
      line,
      fill: `M0,${height} L${line.split(' ').join(' L')} L${width},${height} Z`,
      baselineY: y(base),
      lastX: x(points.length - 1),
      lastY: y(last),
      direction: last >= base ? 'up' : 'down',
    } as const;
  }, [data, baseline, width, height, strokeWidth, showBaseline, markLast]);

  if (!geometry) {
    return <svg className={className} width={width} height={height} aria-hidden="true" />;
  }

  const stroke = color ?? `var(--${geometry.direction})`;

  return (
    <svg
      className={cn('block overflow-visible', className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={aria['aria-label'] ? 'img' : 'presentation'}
      aria-label={aria['aria-label']}
      aria-hidden={aria['aria-label'] ? undefined : true}
    >
      {area && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={geometry.fill} fill={`url(#${gradientId})`} stroke="none" />
        </>
      )}
      {showBaseline && (
        <line
          x1={0}
          x2={width}
          y1={geometry.baselineY}
          y2={geometry.baselineY}
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}
      <polyline
        points={geometry.line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {markLast && (
        <circle cx={geometry.lastX} cy={geometry.lastY} r={strokeWidth + 0.9} fill={stroke} />
      )}
    </svg>
  );
}
