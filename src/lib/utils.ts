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

/** Shared empty array, so a normalized-away prop keeps a stable identity and
 *  does not invalidate the `useMemo` that depends on it on every render. */
const EMPTY: readonly never[] = Object.freeze([]);

/**
 * Coerces a feed-supplied collection to something safe to iterate.
 *
 * A live feed is not a type system. Sockets drop fields, REST returns `null`
 * for "no rows yet", and a panel mounts before its first payload lands. None
 * of that should unmount the React tree — a component with nothing to show
 * renders its empty state instead. Returns a frozen shared array when the
 * input is unusable, so the identity stays stable across renders.
 */
export function toArray<T>(value: readonly T[] | null | undefined): readonly T[] {
  return Array.isArray(value) ? value : (EMPTY as readonly T[]);
}

/** `toArray` for both sides of a book, tolerating a missing snapshot entirely. */
export function toBook<T>(book: { bids?: readonly T[] | null; asks?: readonly T[] | null } | null | undefined) {
  return { bids: toArray(book?.bids), asks: toArray(book?.asks) };
}
