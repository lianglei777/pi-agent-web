import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { mergeClasses } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--motion-fast)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[var(--disabled-surface)] disabled:text-[var(--disabled-text)] focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px active:bg-selected [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-primary-foreground hover:bg-accent-hover",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-line-subtle bg-card hover:border-line-strong hover:bg-hover hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-muted-foreground hover:bg-hover hover:text-foreground",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={mergeClasses(buttonVariants({ variant, size, className }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
