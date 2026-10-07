import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { decimalsOf } from '../../format';
import { cn } from '../../utils';
import { Label } from '../ui/label';

export interface NumberFieldProps {
  value: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  /** Unit rendered inside the field, e.g. `USD` or `shares`. */
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  /** Decimals to snap to. Defaults to the decimals implied by `step`. */
  precision?: number;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  hideStepper?: boolean;
  /** Marks the field invalid for assistive tech and tints the border. */
  invalid?: boolean;
  className?: string;
}

/**
 * Numeric entry for prices and quantities.
 *
 * Two things most number inputs get wrong, fixed here:
 *
 * 1. The raw string is kept while focused, so typing `1.` or `0.0` is not
 *    rewritten out from under the cursor mid-keystroke. Only a clamped,
 *    rounded number is ever committed.
 * 2. It is `type="text"` with `inputMode="decimal"`, not `type="number"`. A
 *    real number input silently changes value on mouse wheel - one stray
 *    scroll over a price field is a wrong order - and parses by locale.
 *
 * Arrow keys step by `step`; shift-arrow by ten.
 */
export function NumberField({
  value,
  onChange,
  label,
  suffix,
  step = 1,
  min,
  max,
  precision,
  placeholder,
  disabled = false,
  readOnly = false,
  hideStepper = false,
  invalid = false,
  className,
}: NumberFieldProps) {
  const id = useId();
  const decimals = precision ?? decimalsOf(step);
  const [draft, setDraft] = useState(() => (value === null ? '' : String(value)));
  const [editing, setEditing] = useState(false);

  // While the user is typing, the draft is the source of truth.
  useEffect(() => {
    if (!editing) setDraft(value === null ? '' : value.toFixed(decimals));
  }, [value, decimals, editing]);

  const clamp = (n: number) => {
    let out = n;
    if (min !== undefined) out = Math.max(min, out);
    if (max !== undefined) out = Math.min(max, out);
    return Number(out.toFixed(decimals));
  };

  const commit = (text: string) => {
    const trimmed = text.trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '.') {
      onChange(null);
      setDraft('');
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setDraft(value === null ? '' : value.toFixed(decimals));
      return;
    }
    const next = clamp(parsed);
    onChange(next);
    setDraft(next.toFixed(decimals));
  };

  const bump = (multiplier: number) => {
    const base = value ?? min ?? 0;
    const next = clamp(base + step * multiplier);
    onChange(next);
    setDraft(next.toFixed(decimals));
  };

  return (
    <div className={cn('group flex min-w-0 flex-col gap-1', className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div
        data-slot="number-field"
        className={cn(
          'border-input bg-background flex h-9 items-stretch overflow-hidden rounded-md border shadow-xs transition-[color,box-shadow]',
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
          invalid && 'border-destructive focus-within:ring-destructive/20',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid || undefined}
          className="text-foreground placeholder:text-muted-foreground/70 min-w-0 flex-1 bg-transparent px-2 text-right font-mono text-sm tabular-nums outline-none"
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          onFocus={() => setEditing(true)}
          onChange={(e) => {
            const next = e.target.value;
            if (/^-?\d*\.?\d*$/.test(next)) setDraft(next);
          }}
          onBlur={() => {
            setEditing(false);
            commit(draft);
          }}
          onKeyDown={(e) => {
            if (readOnly || disabled) return;
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              bump(e.shiftKey ? 10 : 1);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              bump(e.shiftKey ? -10 : -1);
            } else if (e.key === 'Enter') {
              commit(draft);
            }
          }}
        />
        {suffix && (
          <span className="text-muted-foreground bg-muted flex items-center border-l px-2 text-[10px]">
            {suffix}
          </span>
        )}
        {!hideStepper && !readOnly && (
          <div className="flex flex-col border-l">
            <button
              type="button"
              aria-label="Increase"
              // Not a tab stop: arrow keys already do this from the input, and
              // two extra stops per field makes a ticket slow to tab through.
              tabIndex={-1}
              disabled={disabled}
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex flex-1 cursor-pointer items-center justify-center border-b px-1"
              onClick={() => bump(1)}
            >
              <ChevronUpIcon className="size-3" />
            </button>
            <button
              type="button"
              aria-label="Decrease"
              tabIndex={-1}
              disabled={disabled}
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex flex-1 cursor-pointer items-center justify-center px-1"
              onClick={() => bump(-1)}
            >
              <ChevronDownIcon className="size-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
