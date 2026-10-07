import { CheckIcon, CopyIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib';

export interface CopyCommandProps {
  command: string;
  /** Shown instead of the full command; the full string is still copied. */
  label?: string;
  size?: 'sm' | 'default';
  className?: string;
}

/**
 * A shell command you can take. The copy button reports what happened rather
 * than silently succeeding, and announces it to screen readers.
 */
export function CopyCommand({ command, label, size = 'default', className }: CopyCommandProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(command);
      setState('copied');
    } catch {
      // Clipboard is blocked in some embeds and over plain http - say so
      // instead of pretending it worked.
      setState('failed');
    }
    timer.current = setTimeout(() => setState('idle'), 2000);
  };

  return (
    <div
      className={cn(
        'group border-border bg-card flex items-center gap-3 rounded-lg border',
        size === 'sm' ? 'py-1.5 pr-1.5 pl-2.5' : 'py-2.5 pr-2.5 pl-3.5',
        className,
      )}
    >
      <span aria-hidden="true" className="text-muted-foreground/60 font-mono text-xs select-none">
        $
      </span>
      <code
        className={cn(
          'text-foreground min-w-0 flex-1 overflow-x-auto font-mono whitespace-nowrap',
          size === 'sm' ? 'text-[11px]' : 'text-[13px]',
        )}
      >
        {label ?? command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy: ${command}`}
        className={cn(
          'text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring grid shrink-0 cursor-pointer place-items-center rounded-md transition-colors outline-none focus-visible:ring-2',
          size === 'sm' ? 'size-6' : 'size-8',
          state === 'copied' && 'text-up',
          state === 'failed' && 'text-down',
        )}
      >
        {state === 'copied' ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'copied' ? 'Copied to clipboard' : state === 'failed' ? 'Copy failed' : ''}
      </span>
    </div>
  );
}
