import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';
import { createContext, useContext, type ComponentProps } from 'react';
import { cn } from '../../utils';

/**
 * Radix ToggleGroup, styled as a segmented control.
 *
 * Radix is doing the part that is easy to get wrong by hand: roving tabindex,
 * arrow-key navigation, and the right roles for single vs multiple selection.
 */
const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-sm text-[11px] font-semibold tracking-wide whitespace-nowrap transition-colors outline-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-ring/50 focus-visible:ring-2 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          'text-muted-foreground hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm',
        direction:
          'text-muted-foreground hover:text-foreground data-[state=on]:shadow-sm data-[value=buy]:data-[state=on]:bg-up data-[value=buy]:data-[state=on]:text-up-foreground data-[value=sell]:data-[state=on]:bg-down data-[value=sell]:data-[state=on]:text-down-foreground',
      },
      size: {
        default: 'h-6 px-2.5',
        sm: 'h-5 px-2 text-[10px]',
        lg: 'h-8 px-3 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

const ToggleGroupContext = createContext<VariantProps<typeof toggleGroupItemVariants>>({
  variant: 'default',
  size: 'default',
});

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleGroupItemVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        'bg-secondary/70 inline-flex w-fit items-center gap-0.5 rounded-md border p-0.5',
        'data-[orientation=vertical]:flex-col',
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleGroupItemVariants>) {
  const context = useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-value={props.value}
      className={cn(
        toggleGroupItemVariants({
          variant: variant ?? context.variant,
          size: size ?? context.size,
        }),
        'min-w-0 flex-1',
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem, toggleGroupItemVariants };
