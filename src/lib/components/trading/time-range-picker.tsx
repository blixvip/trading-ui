import { cn } from '../../utils';
import { SegmentedControl } from './segmented-control';

export type TimeRange = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL';

export const TIME_RANGES: Array<{ value: TimeRange; label: string }> = [
  { value: '1D', label: '1D' },
  { value: '5D', label: '5D' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: 'YTD', label: 'YTD' },
  { value: '1Y', label: '1Y' },
  { value: '5Y', label: '5Y' },
  { value: 'ALL', label: 'All' },
];

/**
 * Resolves a range to a concrete `[from, to]` in epoch ms.
 *
 * Calendar-aware rather than a fixed multiple of 86,400,000: YTD means January
 * 1st of this year, and a month back from the 31st is the 28th in February, not
 * thirty days earlier. Getting that wrong shifts every bar on the chart.
 */
export function resolveTimeRange(range: TimeRange, now = Date.now()): [number, number] {
  const to = new Date(now);
  const from = new Date(now);

  switch (range) {
    case '1D':
      from.setDate(from.getDate() - 1);
      break;
    case '5D':
      from.setDate(from.getDate() - 5);
      break;
    case '1M':
      from.setMonth(from.getMonth() - 1);
      break;
    case '3M':
      from.setMonth(from.getMonth() - 3);
      break;
    case '6M':
      from.setMonth(from.getMonth() - 6);
      break;
    case 'YTD':
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
    case '1Y':
      from.setFullYear(from.getFullYear() - 1);
      break;
    case '5Y':
      from.setFullYear(from.getFullYear() - 5);
      break;
    case 'ALL':
      return [0, to.getTime()];
  }

  return [from.getTime(), to.getTime()];
}

export interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  /** Subset to offer. Defaults to the full set. */
  ranges?: TimeRange[];
  size?: 'sm' | 'default';
  className?: string;
}

/** Lookback selector for a chart or a performance view. */
export function TimeRangePicker({
  value,
  onChange,
  ranges,
  size = 'sm',
  className,
}: TimeRangePickerProps) {
  const options = ranges
    ? TIME_RANGES.filter((r) => ranges.includes(r.value))
    : TIME_RANGES;

  return (
    <SegmentedControl
      size={size}
      aria-label="Time range"
      value={value}
      onChange={(v) => onChange(v as TimeRange)}
      options={options}
      className={cn(className)}
    />
  );
}
