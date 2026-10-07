import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { directionOf, formatPercent, formatSigned } from '../../format';
import { cn } from '../../utils';
import { Badge } from '../ui/badge';

export interface DeltaProps {
  /** Absolute change. Omit to show the percentage alone. */
  value?: number;
  /** Change as a ratio (0.0421 renders as +4.21%). */
  percent?: number;
  precision?: number;
  /** Boxed badge instead of bare text. */
  pill?: boolean;
  /** Prefix with a trend icon. */
  icon?: boolean;
  className?: string;
}

/**
 * The change indicator.
 *
 * Direction is carried three ways at once - color, an icon, and an explicit
 * sign. Color alone fails a colorblind reader; in a grayscale screenshot or a
 * printed risk report it fails everyone.
 */
export function Delta({
  value,
  percent,
  precision = 2,
  pill = false,
  icon = true,
  className,
}: DeltaProps) {
  const basis = value ?? percent ?? 0;
  const direction = directionOf(basis);

  const parts: string[] = [];
  if (value !== undefined) parts.push(formatSigned(value, precision));
  if (percent !== undefined) {
    parts.push(
      value !== undefined
        ? `(${formatPercent(percent, precision, false)})`
        : formatPercent(percent, precision),
    );
  }

  const Icon =
    direction === 'up' ? TrendingUpIcon : direction === 'down' ? TrendingDownIcon : null;
  const tone = direction === 'up' ? 'text-up' : direction === 'down' ? 'text-down' : 'text-flat';

  const body = (
    <>
      {icon && Icon && <Icon className="size-3 shrink-0" aria-hidden="true" />}
      <span className="sr-only">
        {direction === 'up' ? 'up' : direction === 'down' ? 'down' : 'unchanged'}{' '}
      </span>
      {parts.join(' ')}
    </>
  );

  if (pill) {
    return (
      <Badge variant={direction} className={cn('font-mono tabular-nums', className)}>
        {body}
      </Badge>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums whitespace-nowrap',
        tone,
        className,
      )}
    >
      {body}
    </span>
  );
}
