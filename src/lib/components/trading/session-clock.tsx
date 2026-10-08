import { useEffect, useState } from 'react';
import { cn } from '../../utils';
import { Badge } from '../ui/badge';

export type SessionPhase = 'closed' | 'pre' | 'open' | 'post';

export interface SessionWindow {
  /** Minutes from local midnight. 9:30am is 570. */
  preOpen?: number;
  open: number;
  close: number;
  postClose?: number;
  /** Days the venue trades. 0 is Sunday. Defaults to Mon–Fri. */
  days?: number[];
  label?: string;
}

/** US equities regular hours, with the usual pre and post sessions. */
export const US_EQUITIES: SessionWindow = {
  preOpen: 4 * 60,
  open: 9 * 60 + 30,
  close: 16 * 60,
  postClose: 20 * 60,
  days: [1, 2, 3, 4, 5],
  label: 'NYSE',
};

/** Crypto: always on, which the component has to handle as a real case. */
export const ALWAYS_OPEN: SessionWindow = {
  open: 0,
  close: 24 * 60,
  days: [0, 1, 2, 3, 4, 5, 6],
  label: '24/7',
};

export interface SessionState {
  phase: SessionPhase;
  /** Milliseconds to the next phase change, or null when it never changes. */
  msToNext: number | null;
  nextLabel: string;
}

export function resolveSession(window: SessionWindow, now = new Date()): SessionState {
  const days = window.days ?? [1, 2, 3, 4, 5];
  const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const trading = days.includes(now.getDay());

  // A venue that never closes has no countdown, and inventing one would be a
  // lie the UI repeats every second.
  if (trading && window.open === 0 && window.close >= 24 * 60) {
    return { phase: 'open', msToNext: null, nextLabel: 'Always open' };
  }

  const toMs = (target: number) => Math.max(0, (target - minutes) * 60_000);

  if (!trading) return { phase: 'closed', msToNext: null, nextLabel: 'Opens next session' };

  const pre = window.preOpen ?? window.open;
  const post = window.postClose ?? window.close;

  if (minutes < pre) return { phase: 'closed', msToNext: toMs(pre), nextLabel: 'Pre-market in' };
  if (minutes < window.open) return { phase: 'pre', msToNext: toMs(window.open), nextLabel: 'Opens in' };
  if (minutes < window.close) return { phase: 'open', msToNext: toMs(window.close), nextLabel: 'Closes in' };
  if (minutes < post) return { phase: 'post', msToNext: toMs(post), nextLabel: 'After-hours ends in' };
  return { phase: 'closed', msToNext: null, nextLabel: 'Opens next session' };
}

const PHASE_LABEL: Record<SessionPhase, string> = {
  closed: 'Closed',
  pre: 'Pre-market',
  open: 'Open',
  post: 'After hours',
};

const PHASE_VARIANT: Record<SessionPhase, 'up' | 'secondary' | 'flat'> = {
  closed: 'flat',
  pre: 'secondary',
  open: 'up',
  post: 'secondary',
};

function countdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export interface SessionClockProps {
  session?: SessionWindow;
  /** Show the venue's local time alongside the phase. */
  showClock?: boolean;
  /** Freeze the clock — for tests and reproducible screenshots. */
  now?: Date;
  className?: string;
}

/**
 * Market status with a countdown to the next phase change.
 *
 * The phase is carried by a label, not only by a dot, because "is the market
 * open" is the one piece of state on a trading screen you cannot afford to read
 * wrong from colour alone.
 */
export function SessionClock({
  session = US_EQUITIES,
  showClock = true,
  now,
  className,
}: SessionClockProps) {
  const [tick, setTick] = useState(() => now ?? new Date());

  useEffect(() => {
    if (now) return;
    const id = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(id);
  }, [now]);

  const current = now ?? tick;
  const state = resolveSession(session, current);

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Badge variant={PHASE_VARIANT[state.phase]} className="gap-1.5">
        <span
          aria-hidden="true"
          className={cn(
            'size-1.5 rounded-full',
            state.phase === 'open' ? 'bg-up' : 'bg-current opacity-70',
          )}
        />
        {PHASE_LABEL[state.phase]}
      </Badge>

      {state.msToNext !== null && (
        <span className="text-muted-foreground text-[11px]">
          {state.nextLabel}{' '}
          <span className="text-foreground font-mono font-medium tabular-nums">
            {countdown(state.msToNext)}
          </span>
        </span>
      )}

      {showClock && (
        <span className="text-muted-foreground ml-auto font-mono text-[11px] tabular-nums">
          {current.toTimeString().slice(0, 8)}
          {session.label ? ` · ${session.label}` : ''}
        </span>
      )}
    </div>
  );
}
