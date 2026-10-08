'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { cn } from '../../utils';

export interface PanelBoundaryProps {
  children: ReactNode;
  /** Named in the fallback, so a trader can say which panel died. */
  label?: string;
  /** Replaces the default fallback entirely. */
  fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  /** Forward to Sentry, Datadog, your own logger. */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Changing any entry remounts the subtree - pass the symbol to recover on
   *  the next instrument rather than stranding the user on a dead panel. */
  resetKeys?: unknown[];
  className?: string;
}

interface State {
  error: Error | null;
}

/**
 * Whether a `resetKeys` change should clear the error and remount.
 *
 * Pulled out of the class so it is testable: React error boundaries only run
 * on the client, never under `renderToStaticMarkup`, so this is the part of
 * the component a server-side suite can actually assert on.
 */
export function resetKeysChanged(before: readonly unknown[], after: readonly unknown[]): boolean {
  return before.length !== after.length || after.some((key, i) => !Object.is(key, before[i]));
}

/**
 * Contains a render failure to one panel.
 *
 * A trading screen is a grid of independent widgets fed by the same socket. An
 * uncaught error in any one of them unmounts the entire React tree by default,
 * so a malformed depth payload takes the blotter, the positions and the ticket
 * down with it - at precisely the moment the user most needs to see their
 * exposure and get out.
 *
 * This is a class component because `getDerivedStateFromError` has no hook
 * equivalent; React still offers no other way to catch a render error.
 *
 * It does not catch errors thrown in event handlers or in async callbacks -
 * React boundaries never have. Those still belong in a try/catch.
 */
export class PanelBoundary extends Component<PanelBoundaryProps, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prev: PanelBoundaryProps) {
    const { resetKeys } = this.props;
    if (!this.state.error || !resetKeys) return;
    if (resetKeysChanged(prev.resetKeys ?? [], resetKeys)) this.setState({ error: null });
  }

  retry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    const { children, label, fallback, className } = this.props;
    if (!error) return children;

    if (typeof fallback === 'function') return fallback(error, this.retry);
    if (fallback !== undefined) return fallback;

    return (
      <div
        role="alert"
        data-slot="panel-boundary"
        className={cn(
          'border-down/40 bg-down-muted/30 text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-md border border-dashed p-5 text-center',
          className,
        )}
      >
        <p className="text-foreground text-xs font-medium">
          {label ? `${label} stopped updating` : 'This panel stopped updating'}
        </p>
        <p className="max-w-[40ch] text-[11px] leading-relaxed">
          The rest of the screen is unaffected. Your positions and working orders are
          unchanged — this is a display fault, not a trading one.
        </p>
        <button
          type="button"
          onClick={this.retry}
          className="border-border hover:bg-accent focus-visible:ring-ring mt-1 rounded border px-2 py-1 text-[11px] font-medium outline-none focus-visible:ring-1"
        >
          Retry
        </button>
      </div>
    );
  }
}
