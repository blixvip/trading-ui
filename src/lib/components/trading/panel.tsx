'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../utils';

export interface PanelProps extends Omit<ComponentProps<typeof Card>, 'title'> {
  title?: ReactNode;
  /** Right-aligned header controls: interval pickers, layout toggles. */
  actions?: ReactNode;
  children?: ReactNode;
  /** Pad the body. Leave off for tables and ladders that own their padding. */
  padded?: boolean;
  /** Drop the frame so the panel can sit inside existing chrome. */
  flush?: boolean;
  /** Let the body scroll instead of growing the panel. */
  scroll?: boolean;
  contentClassName?: string;
}

/**
 * The frame every widget sits in: fixed header, flexible body.
 *
 * `min-h-0` on the body is the part that matters - without it a chart panel
 * refuses to shrink inside a flex or grid terminal layout and pushes the whole
 * page open instead.
 */
export function Panel({
  title,
  actions,
  children,
  padded = false,
  flush = false,
  scroll = false,
  className,
  contentClassName,
  ...props
}: PanelProps) {
  return (
    <Card
      data-slot="panel"
      className={cn(
        'min-h-0 min-w-0 gap-0 overflow-hidden',
        flush && 'rounded-none border-0 bg-transparent shadow-none',
        className,
      )}
      {...props}
    >
      {(title || actions) && (
        <CardHeader className="shrink-0">
          {title && <CardTitle>{title}</CardTitle>}
          {actions && <CardAction>{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          padded && 'p-3',
          scroll && 'overflow-auto',
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
