'use client';

import type { SVGProps } from 'react';
import { cn } from '../../utils';

/**
 * Empty-state illustrations.
 *
 * One drawn family, not five unrelated pictures: every one is built from the
 * same vocabulary - hairline rules at the same rhythm, a dashed reference
 * line, and small tick marks - so an empty book and an empty blotter read as
 * two states of the same instrument.
 *
 * All strokes are `currentColor` at graded opacity, so the caller sets one
 * colour and the drawing stays in the theme. 1.25px stroke throughout, matching
 * the hairline weight of the components they sit inside.
 */

type IllustrationProps = SVGProps<SVGSVGElement>;

function Frame({ className, children, ...props }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('h-20 w-auto text-muted-foreground', className)}
      {...props}
    >
      {children}
    </svg>
  );
}

/** Empty ladder: rows thinning out, with a gap where the touch would be. */
export function EmptyBookArt(props: IllustrationProps) {
  return (
    <Frame {...props}>
      {[0, 1, 2].map((i) => (
        <g key={`a${i}`} opacity={0.18 + i * 0.07}>
          <rect
            x={18}
            y={8 + i * 10}
            width={84 - i * 6}
            height={5}
            rx={1.5}
            fill="currentColor"
          />
        </g>
      ))}
      {/* The spread. The one place the drawing breaks rhythm, because that is
          the thing the component is for. */}
      <line
        x1={10}
        y1={43}
        x2={110}
        y2={43}
        stroke="currentColor"
        strokeWidth={1.25}
        strokeDasharray="3 4"
        opacity={0.55}
      />
      {[0, 1, 2].map((i) => (
        <g key={`b${i}`} opacity={0.25 - i * 0.07}>
          <rect
            x={18}
            y={52 + i * 10}
            width={72 + i * 6}
            height={5}
            rx={1.5}
            fill="currentColor"
          />
        </g>
      ))}
    </Frame>
  );
}

/** Empty tape: a paper strip running out, prints trailing to nothing. */
export function EmptyTapeArt(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect
        x={14}
        y={16}
        width={92}
        height={48}
        rx={3}
        stroke="currentColor"
        strokeWidth={1.25}
        opacity={0.35}
      />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} opacity={0.4 - i * 0.09}>
          <rect x={24} y={26 + i * 10} width={18} height={4} rx={1.5} fill="currentColor" />
          <rect x={50} y={26 + i * 10} width={22} height={4} rx={1.5} fill="currentColor" />
          <rect x={80} y={26 + i * 10} width={14} height={4} rx={1.5} fill="currentColor" />
        </g>
      ))}
      {/* Sprocket perforations, so it reads as tape rather than a table. */}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={9} cy={22 + i * 9} r={1.4} fill="currentColor" opacity={0.3} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={111} cy={22 + i * 9} r={1.4} fill="currentColor" opacity={0.3} />
      ))}
    </Frame>
  );
}

/** No positions: a flat book — axis with nothing plotted against it. */
export function EmptyPositionsArt(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <line x1={18} y1={14} x2={18} y2={62} stroke="currentColor" strokeWidth={1.25} opacity={0.4} />
      <line x1={18} y1={62} x2={104} y2={62} stroke="currentColor" strokeWidth={1.25} opacity={0.4} />
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1={15}
          y1={22 + i * 14}
          x2={18}
          y2={22 + i * 14}
          stroke="currentColor"
          strokeWidth={1.25}
          opacity={0.3}
        />
      ))}
      <line
        x1={18}
        y1={40}
        x2={104}
        y2={40}
        stroke="currentColor"
        strokeWidth={1.25}
        strokeDasharray="3 4"
        opacity={0.5}
      />
      <circle cx={61} cy={40} r={3} stroke="currentColor" strokeWidth={1.25} opacity={0.55} />
    </Frame>
  );
}

/** No orders: a blank ticket, fields unfilled. */
export function EmptyOrdersArt(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <path
        d="M30 10h52a3 3 0 0 1 3 3v54a3 3 0 0 1-3 3H30a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3Z"
        stroke="currentColor"
        strokeWidth={1.25}
        opacity={0.35}
      />
      <rect x={36} y={19} width={28} height={4} rx={1.5} fill="currentColor" opacity={0.4} />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={36}
          y={32 + i * 11}
          width={40 - i * 8}
          height={4}
          rx={1.5}
          fill="currentColor"
          opacity={0.22}
        />
      ))}
      <line
        x1={36}
        y1={60}
        x2={76}
        y2={60}
        stroke="currentColor"
        strokeWidth={1.25}
        strokeDasharray="3 4"
        opacity={0.45}
      />
    </Frame>
  );
}

/** Empty watchlist: rows waiting, each with a flat line where a trend goes. */
export function EmptyWatchlistArt(props: IllustrationProps) {
  return (
    <Frame {...props}>
      {[0, 1, 2].map((i) => (
        <g key={i} opacity={0.4 - i * 0.1}>
          <rect x={14} y={18 + i * 16} width={20} height={4} rx={1.5} fill="currentColor" />
          <line
            x1={44}
            y1={20 + i * 16}
            x2={78}
            y2={20 + i * 16}
            stroke="currentColor"
            strokeWidth={1.25}
            strokeDasharray="3 4"
          />
          <rect x={88} y={18 + i * 16} width={18} height={4} rx={1.5} fill="currentColor" />
        </g>
      ))}
    </Frame>
  );
}

/** Nothing to chart: axes with a dashed, featureless series. */
export function EmptyChartArt(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <line x1={16} y1={12} x2={16} y2={62} stroke="currentColor" strokeWidth={1.25} opacity={0.4} />
      <line x1={16} y1={62} x2={106} y2={62} stroke="currentColor" strokeWidth={1.25} opacity={0.4} />
      <path
        d="M16 48 L38 38 L58 44 L78 28 L106 34"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeDasharray="3 4"
        opacity={0.45}
      />
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={30 + i * 22}
          y1={62}
          x2={30 + i * 22}
          y2={65}
          stroke="currentColor"
          strokeWidth={1.25}
          opacity={0.3}
        />
      ))}
    </Frame>
  );
}
