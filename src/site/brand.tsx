import type { SVGProps } from 'react';

/**
 * The mark: a price ladder reduced to four rungs, two above the spread and two
 * below, with the gap at the touch left open. It is the one shape every screen
 * in this library has in common, it survives at 16px as a favicon, and it is
 * drawn from the same hairline vocabulary as the empty states.
 *
 * Direction colour is load-bearing here: the top pair is the offer, the bottom
 * pair the bid. `monochrome` drops that for places colour cannot be trusted.
 */
export function Logomark({
  monochrome = false,
  ...props
}: SVGProps<SVGSVGElement> & { monochrome?: boolean }) {
  const up = monochrome ? 'currentColor' : 'var(--up)';
  const down = monochrome ? 'currentColor' : 'var(--down)';
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--card)" />
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="6.5"
        stroke="currentColor"
        strokeOpacity="0.22"
      />
      {/* offers */}
      <rect x="7" y="7.5" width="18" height="2.5" rx="1.25" fill={down} opacity="0.55" />
      <rect x="7" y="12" width="12" height="2.5" rx="1.25" fill={down} />
      {/* the touch */}
      <rect x="7" y="16.4" width="18" height="1" rx="0.5" fill="currentColor" opacity="0.3" />
      {/* bids */}
      <rect x="7" y="19" width="14" height="2.5" rx="1.25" fill={up} />
      <rect x="7" y="23.5" width="9" height="2.5" rx="1.25" fill={up} opacity="0.55" />
    </svg>
  );
}

/** Mark plus wordmark. The wordmark is mono, because the product is numbers. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <Logomark className="size-7 shrink-0" />
      <span className="font-mono text-[15px] font-semibold tracking-tight">
        trading<span className="text-muted-foreground">-</span>ui
      </span>
    </span>
  );
}

/**
 * The engraved ground behind the hero: graph paper at a density that reads as
 * texture rather than as a chart, so it never competes with the real gridlines
 * inside the terminal sitting on top of it.
 */
export function GridField({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id="tu-grid-fine" width="28" height="28" patternUnits="userSpaceOnUse">
          <path
            d="M28 0H0V28"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.5"
            strokeWidth="1"
          />
        </pattern>
        <pattern id="tu-grid-coarse" width="140" height="140" patternUnits="userSpaceOnUse">
          <rect width="140" height="140" fill="url(#tu-grid-fine)" />
          <path d="M140 0H0V140" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
        <radialGradient id="tu-grid-fade" cx="50%" cy="0%" r="90%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="65%" stopColor="white" stopOpacity="0.25" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="tu-grid-mask">
          <rect width="100%" height="100%" fill="url(#tu-grid-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#tu-grid-coarse)" mask="url(#tu-grid-mask)" />
    </svg>
  );
}
