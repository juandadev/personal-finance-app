import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const cardPaddingClasses = {
  default: "p-5 md:p-8",
  overview: "p-6",
  compact: "p-5 sm:p-6",
  fixed: "p-6",
  none: "p-0",
} as const

const cardVariantClasses = {
  default: "bg-card text-card-foreground",
  primary: "bg-primary text-primary-foreground",
  sidebar: "bg-sidebar text-sidebar-primary-foreground",
} as const

interface CardProps extends React.ComponentProps<"div"> {
  asChild?: boolean
  padding?: keyof typeof cardPaddingClasses
  variant?: keyof typeof cardVariantClasses
}

const cardTitleSizeClasses = {
  default: "text-xl tracking-tight",
  sm: "text-base",
} as const

const cardActionLinkClasses =
  "text-muted-foreground hover:text-foreground inline-flex items-center gap-3 text-sm transition-colors"

interface CardTitleProps extends React.ComponentProps<"div"> {
  size?: keyof typeof cardTitleSizeClasses
}

function Card({
  asChild,
  className,
  padding = "default",
  variant = "default",
  ...props
}: CardProps) {
  const Comp: React.ElementType = asChild ? Slot : "div"

  return (
    <Comp
      data-slot="card"
      className={cn(
        "rounded-xl shadow-none",
        cardVariantClasses[variant],
        cardPaddingClasses[padding],
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex items-center justify-between gap-4", className)}
      {...props}
    />
  )
}

function CardTitle({ className, size = "default", ...props }: CardTitleProps) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-card-foreground flex items-center gap-3 font-bold",
        cardTitleSizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("flex items-center", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardActionLinkClasses,
}
