import { cn } from '../../utils';
import { Badge } from '../ui/badge';

export type FeedState = 'connected' | 'connecting' | 'degraded' | 'disconnected';

export interface ConnectionStatusProps {
  state: FeedState;
  /** Round-trip latency in milliseconds. */
  latencyMs?: number;
  /** When the last message arrived, for a staleness readout. */
  lastMessageAt?: number;
  /** Latency above this reads as slow even when connected. */
  slowAt?: number;
  label?: string;
  className?: string;
}

const STATE_LABEL: Record<FeedState, string> = {
  connected: 'Live',
  connecting: 'Connecting',
  degraded: 'Degraded',
  disconnected: 'Offline',
};

/**
 * Feed health.
 *
 * On a trading screen a stale price is more dangerous than no price, because it
 * still looks tradeable. So this reports latency as a number, names the state
 * in words, and treats "connected but slow" as its own state rather than
 * folding it into a green dot.
 */
export function ConnectionStatus({
  state,
  latencyMs,
  lastMessageAt,
  slowAt = 400,
  label,
  className,
}: ConnectionStatusProps) {
  const slow = state === 'connected' && latencyMs !== undefined && latencyMs >= slowAt;
  const effective: FeedState = slow ? 'degraded' : state;

  const variant =
    effective === 'connected'
      ? 'up'
      : effective === 'disconnected'
        ? 'down'
        : effective === 'degraded'
          ? 'secondary'
          : 'flat';

  const staleSeconds =
    lastMessageAt !== undefined ? Math.floor((Date.now() - lastMessageAt) / 1000) : undefined;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant={variant} className="gap-1.5">
        <span
          aria-hidden="true"
          className={cn(
            'size-1.5 rounded-full bg-current',
            state === 'connecting' && 'animate-shimmer',
          )}
        />
        {label ?? STATE_LABEL[effective]}
      </Badge>

      {latencyMs !== undefined && effective !== 'disconnected' && (
        <span
          className={cn(
            'font-mono text-[11px] tabular-nums',
            slow ? 'text-warn' : 'text-muted-foreground',
          )}
          title="Round-trip latency"
        >
          {Math.round(latencyMs)} ms
        </span>
      )}

      {staleSeconds !== undefined && staleSeconds > 5 && (
        <span className="text-warn font-mono text-[11px] tabular-nums">
          stale {staleSeconds}s
        </span>
      )}
    </div>
  );
}
