import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { mergeClasses } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent text-white",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-muted-foreground",
        success:
          "border-green-600/20 bg-green-600/10 text-green-700 dark:text-green-400",
        destructive:
          "border-red-600/20 bg-red-600/10 text-red-700 dark:text-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      className={mergeClasses(badgeVariants({ variant }), className)}
      data-slot="badge"
      {...props}
    />
  );
}

export { Badge, badgeVariants };
