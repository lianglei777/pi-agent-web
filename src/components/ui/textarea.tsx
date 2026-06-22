import * as React from "react";
import { mergeClasses } from "@/lib/utils";

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={mergeClasses(
        "flex min-h-16 w-full rounded-md border border-line-subtle bg-transparent px-3 py-2 text-sm outline-none transition-[color,border-color,box-shadow] duration-[var(--motion-fast)] placeholder:text-muted hover:border-line-strong disabled:cursor-not-allowed disabled:bg-[var(--disabled-surface)] disabled:text-[var(--disabled-text)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
      data-slot="textarea"
      {...props}
    />
  );
}

export { Textarea };
