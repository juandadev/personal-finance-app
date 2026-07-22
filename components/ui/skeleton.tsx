import { cn } from "@/lib/utils"

type SkeletonProps = React.ComponentProps<"div"> & {
  animate?: boolean
  as?: "div" | "span"
}

function Skeleton({
  className,
  animate = true,
  as = "div",
  ...props
}: SkeletonProps) {
  const Comp = as

  return (
    <Comp
      data-slot="skeleton"
      className={cn(
        "bg-muted rounded-md",
        as === "span" && "inline-block",
        animate && "animate-pulse",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
