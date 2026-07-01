import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-4 whitespace-nowrap rounded-lg text-sm transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-finance-grey-500 hover:border-finance-grey-500",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/80 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-transparent hover:bg-muted-foreground hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-transparent hover:border-border",
        surface: "bg-background text-foreground hover:bg-muted",
        ghost: "hover:opacity-80",
        link: "text-primary underline-offset-4 hover:underline",
        "muted-link":
          "text-muted-foreground hover:text-foreground hover:bg-transparent",
        input:
          "border border-input bg-transparent text-foreground shadow-none hover:border-finance-grey-500 focus-visible:border-finance-grey-500 data-[empty=true]:text-finance-beige-500",
      },
      size: {
        default: "h-13 p-4 has-[>svg]:px-3",
        sm: "h-10 rounded-lg p-4 gap-5",
        lg: "h-14 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-8",
        "icon-sm": "size-5 rounded-none",
        "icon-lg": "size-10 rounded-full",
        "card-action": "h-auto rounded-lg px-4 py-3 text-sm font-bold",
        "finance-submit": "h-13.25 w-full rounded-lg text-sm font-bold",
        "text-link": "h-auto p-0 text-sm font-normal",
        input: "h-11.5 w-full min-w-0 justify-start px-5 py-3 font-normal",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp: React.ElementType = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }), "")}
      {...props}
    />
  )
}

export { Button, buttonVariants }
