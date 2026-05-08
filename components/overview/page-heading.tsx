import React from "react"
import { cn } from "@/lib/utils"

interface PageHeadingProps {
  title: string
  children?: React.ReactNode
  className?: string
  fixed?: boolean
}

export function PageHeading({
  title,
  children,
  className,
  fixed,
}: PageHeadingProps) {
  return (
    <header
      className={cn(
        "bg-background z-1 flex items-center justify-between py-1",
        fixed &&
          "fixed inset-x-0 top-0 w-full px-4 py-7 md:px-10 md:py-8 lg:relative lg:p-0 [&+div]:mt-22 [&+div]:lg:mt-0",
        className,
      )}
    >
      <h1 className="text-foreground text-[32px] font-bold tracking-tight">
        {title}
      </h1>
      {children}
    </header>
  )
}
