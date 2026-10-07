import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { TooltipProvider } from '../components/ui/tooltip';
import type { Instrument } from '../types';
import { cn } from '../utils';

export type ThemeName = 'dark' | 'light';
export type DirectionPalette = 'classic' | 'colorblind';

export interface TradingTheme {
  theme: ThemeName;
  /** `classic` is green/red; `colorblind` is blue/amber. */
  palette: DirectionPalette;
  /** Formatting defaults for components not given their own instrument. */
  instrument: Instrument;
}

export const defaultInstrument: Instrument = {
  symbol: '',
  pricePrecision: 2,
  tickSize: 0.01,
  sizePrecision: 0,
  currency: '$',
};

const ThemeContext = createContext<TradingTheme>({
  theme: 'dark',
  palette: 'classic',
  instrument: defaultInstrument,
});

export function useTradingTheme(): TradingTheme {
  return useContext(ThemeContext);
}

/**
 * Resolves the instrument a component formats with: its own prop wins, then
 * the provider's, then the library default.
 */
export function useInstrument(override?: Partial<Instrument>): Instrument {
  const { instrument } = useTradingTheme();
  return useMemo(
    () => (override ? { ...instrument, ...override } : instrument),
    [instrument, override],
  );
}

export interface TradingProviderProps {
  children: ReactNode;
  theme?: ThemeName;
  palette?: DirectionPalette;
  instrument?: Partial<Instrument>;
  /** Token overrides, e.g. `{ '--primary': '#ff8a00' }`. */
  tokens?: Record<string, string>;
  /**
   * Skip the wrapper element and inherit whatever theme the host already
   * applies. Use this inside an existing shadcn app that owns `.dark` itself.
   */
  inherit?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Scopes theme, direction palette and instrument defaults to a subtree.
 *
 * Deliberately not a global stylesheet switch: two providers can coexist, so a
 * light-themed report can sit inside a dark terminal. Also mounts a single
 * Radix TooltipProvider so every tooltip in the tree shares one delay timer.
 */
export function TradingProvider({
  children,
  theme = 'dark',
  palette = 'classic',
  instrument,
  tokens,
  inherit = false,
  className,
  style,
}: TradingProviderProps) {
  const value = useMemo<TradingTheme>(
    () => ({ theme, palette, instrument: { ...defaultInstrument, ...instrument } }),
    [theme, palette, instrument],
  );

  const content = <TooltipProvider>{children}</TooltipProvider>;

  return (
    <ThemeContext.Provider value={value}>
      {inherit ? (
        content
      ) : (
        <div
          data-tu-theme={theme}
          data-tu-palette={palette}
          className={cn(
            'bg-background text-foreground [font-feature-settings:"tnum"_0]',
            theme === 'dark' && 'dark',
            className,
          )}
          style={{ ...(tokens as CSSProperties | undefined), ...style }}
        >
          {content}
        </div>
      )}
    </ThemeContext.Provider>
  );
}
