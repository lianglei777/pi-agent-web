import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-line-subtle bg-transparent px-3 py-1 text-base outline-none transition-[color,border-color,box-shadow] duration-[var(--motion-fast)] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted hover:border-line-strong disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--disabled-surface)] disabled:text-[var(--disabled-text)] md:text-sm",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
