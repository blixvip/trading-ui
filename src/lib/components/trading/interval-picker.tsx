'use client';

import { ChevronDownIcon } from 'lucide-react';
import { cn } from '../../utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { SegmentedControl } from './segmented-control';

export type Interval =
  | '1s'
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1H'
  | '2H'
  | '4H'
  | '1D'
  | '1W'
  | '1M';

export interface IntervalOption {
  value: Interval;
  label: string;
  /** Bar length in milliseconds — hand this to your feed. */
  ms: number;
  group: 'Seconds' | 'Minutes' | 'Hours' | 'Days';
}

export const INTERVALS: IntervalOption[] = [
  { value: '1s', label: '1s', ms: 1_000, group: 'Seconds' },
  { value: '1m', label: '1m', ms: 60_000, group: 'Minutes' },
  { value: '3m', label: '3m', ms: 180_000, group: 'Minutes' },
  { value: '5m', label: '5m', ms: 300_000, group: 'Minutes' },
  { value: '15m', label: '15m', ms: 900_000, group: 'Minutes' },
  { value: '30m', label: '30m', ms: 1_800_000, group: 'Minutes' },
  { value: '1H', label: '1H', ms: 3_600_000, group: 'Hours' },
  { value: '2H', label: '2H', ms: 7_200_000, group: 'Hours' },
  { value: '4H', label: '4H', ms: 14_400_000, group: 'Hours' },
  { value: '1D', label: '1D', ms: 86_400_000, group: 'Days' },
  { value: '1W', label: '1W', ms: 604_800_000, group: 'Days' },
  { value: '1M', label: '1M', ms: 2_592_000_000, group: 'Days' },
];

export function intervalMs(value: Interval): number {
  return INTERVALS.find((i) => i.value === value)?.ms ?? 60_000;
}

export interface IntervalPickerProps {
  value: Interval;
  onChange: (value: Interval) => void;
  /** Intervals promoted to always-visible buttons. */
  favorites?: Interval[];
  /** Offer the full grouped list in a dropdown beside the favorites. */
  showAll?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

/**
 * Chart timeframe selector.
 *
 * A desk uses three or four intervals constantly and the rest twice a month, so
 * the favorites stay one click away and everything else lives behind a grouped
 * dropdown. If the current interval is not a favorite it is promoted into the
 * row, so the control always shows what you are actually looking at rather than
 * hiding it inside a collapsed menu.
 */
export function IntervalPicker({
  value,
  onChange,
  favorites = ['1m', '5m', '15m', '1H', '1D'],
  showAll = true,
  size = 'sm',
  className,
}: IntervalPickerProps) {
  const visible = favorites.includes(value) ? favorites : [...favorites, value];
  const groups = Array.from(new Set(INTERVALS.map((i) => i.group)));

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <SegmentedControl
        size={size}
        aria-label="Chart interval"
        value={value}
        onChange={(v) => onChange(v as Interval)}
        options={visible.map((v) => ({
          value: v,
          label: INTERVALS.find((i) => i.value === v)?.label ?? v,
        }))}
      />

      {showAll && (
        <Select value={value} onValueChange={(v) => onChange(v as Interval)}>
          {/* Chevron only: the active interval is already shown in the row
              beside this, so repeating it here would be the same fact twice.
              Radix still needs a SelectValue mounted to track selection. */}
          <SelectTrigger
            size="sm"
            aria-label="All intervals"
            className="h-6 w-7 justify-center px-0 [&>svg:last-child]:hidden"
          >
            <ChevronDownIcon className="size-3.5 shrink-0 opacity-70" />
            <span className="sr-only">
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent align="end">
            {groups.map((group) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {INTERVALS.filter((i) => i.group === group).map((i) => (
                  <SelectItem key={i.value} value={i.value} className="font-mono">
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
