'use client';

import type { ReactNode } from 'react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { cn } from '../../utils';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  /** Announced to screen readers when the label is an icon or abbreviation. */
  title?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** `direction` tints a `buy` value green and a `sell` value red. */
  variant?: 'default' | 'direction';
  size?: 'sm' | 'default' | 'lg';
  block?: boolean;
  'aria-label'?: string;
  className?: string;
}

/**
 * Interval picker, side switch, order-type selector.
 *
 * Wraps Radix ToggleGroup in single-selection mode rather than hand-rolling a
 * radio group: roving tabindex, arrow-key navigation and the correct roles all
 * come from the primitive. The one behavior added on top is refusing to clear -
 * Radix lets a single toggle group deselect itself, and "no side selected" is
 * not a state an order ticket should ever be able to reach.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = 'default',
  size = 'default',
  block = false,
  className,
  ...aria
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      variant={variant}
      size={size}
      aria-label={aria['aria-label']}
      className={cn(block && 'flex w-full', className)}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          aria-label={option.title}
          title={option.title}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
