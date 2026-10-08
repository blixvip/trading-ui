'use client';

import type { ComponentProps } from 'react';
import { cn } from '../../utils';

/** shadcn/ui Card. `Panel` builds the trading chrome on top of this. */
function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex items-center gap-2 border-b px-3 py-2 [.border-b]:pb-2',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'text-muted-foreground text-xs font-semibold tracking-wider uppercase',
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('ml-auto flex items-center gap-1.5', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('min-h-0', className)} {...props} />;
}

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center border-t px-3 py-2', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardAction, CardContent, CardFooter };
