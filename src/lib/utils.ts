import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with later ones winning - the same `cn` shadcn/ui
 * uses, so a consumer can override any class on any component by passing
 * `className`, with no specificity war.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
