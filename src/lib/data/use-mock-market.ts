'use client';

import { useEffect, useRef, useState } from 'react';
import { createMarket, stepMarket, type MarketConfig, type MarketState } from './mock-market';

export interface UseMockMarketOptions extends MarketConfig {
  /** Ticks per second. `0` freezes the feed (and keeps it screenshot-stable). */
  ticksPerSecond?: number;
  seed?: number;
  paused?: boolean;
}

/**
 * Drives the deterministic mock market on a timer. Every demo and story in the
 * library runs off this, which keeps the components themselves feed-agnostic.
 */
export function useMockMarket(symbol = 'AAPL', options: UseMockMarketOptions = {}) {
  const { ticksPerSecond = 2, seed = 7, paused = false, ...config } = options;

  const configRef = useRef(config);
  configRef.current = config;

  const [state, setState] = useState<MarketState>(() => createMarket(symbol, config, seed));

  // A symbol change is a new instrument, not an update: reset rather than step.
  useEffect(() => {
    setState(createMarket(symbol, configRef.current, seed));
  }, [symbol, seed]);

  useEffect(() => {
    if (paused || ticksPerSecond <= 0) return;
    const id = setInterval(
      () => setState((prev) => stepMarket(prev, configRef.current)),
      1000 / ticksPerSecond,
    );
    return () => clearInterval(id);
  }, [paused, ticksPerSecond]);

  return state;
}
