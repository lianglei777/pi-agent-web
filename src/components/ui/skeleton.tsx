import { mergeClasses } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={mergeClasses("animate-pulse rounded-md bg-hover", className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

export { Skeleton };
