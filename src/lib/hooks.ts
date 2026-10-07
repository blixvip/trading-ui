import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Direction } from './types';

/**
 * Measures an element with ResizeObserver. Canvas charts need real pixel
 * dimensions, and in a resizable terminal layout those change constantly.
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const read = () => {
      const rect = el.getBoundingClientRect();
      setSize((prev) =>
        // Sub-pixel churn would re-render on every scroll of a parent.
        Math.abs(prev.width - rect.width) < 0.5 &&
        Math.abs(prev.height - rect.height) < 0.5
          ? prev
          : { width: rect.width, height: rect.height },
      );
    };

    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, size] as const;
}

/**
 * Reports which way a value last moved and clears back to `flat` after
 * `duration`, so a price cell can flash green/red on each tick.
 */
export function usePriceFlash(value: number, duration = 420): Direction {
  const previous = useRef(value);
  const [flash, setFlash] = useState<Direction>('flat');

  useEffect(() => {
    const prev = previous.current;
    previous.current = value;
    if (!Number.isFinite(value) || !Number.isFinite(prev) || value === prev) return;

    setFlash(value > prev ? 'up' : 'down');
    const t = setTimeout(() => setFlash('flat'), duration);
    return () => clearTimeout(t);
  }, [value, duration]);

  return flash;
}

/** The value from the previous render - handy for diffing feed snapshots. */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

/**
 * requestAnimationFrame loop that stays mounted across re-renders. Used by the
 * mock feed and by chart crosshair redraws; `fps` throttles it.
 */
export function useAnimationFrame(callback: (dt: number) => void, fps = 60) {
  const cb = useRef(callback);
  cb.current = callback;

  useEffect(() => {
    if (fps <= 0) return;
    let raf = 0;
    let last = performance.now();
    const minDelta = 1000 / fps;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      if (dt < minDelta) return;
      last = now;
      cb.current(dt);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fps]);
}

/** True when the user has asked the OS to reduce motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
