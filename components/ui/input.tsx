import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  variant = "default",
  ...props
}: React.ComponentProps<"input"> & {
  variant?: "default" | "auth"
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-finance-beige-500 selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-11.5 w-full min-w-0 rounded-lg border bg-transparent px-5 py-3 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "hover:border-finance-grey-500",
        "focus-visible:border-finance-grey-500 focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "[&+svg]:text-foreground [&+svg]:pointer-events-none [&+svg]:absolute [&+svg]:top-1/2 [&+svg]:right-5 [&+svg]:size-4 [&+svg]:shrink-0 [&+svg]:-translate-y-1/2 [&:has(+svg)]:pr-13",
        variant === "auth" &&
          "bg-card text-foreground focus-visible:border-ring focus-visible:ring-ring/30 h-11.25",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
