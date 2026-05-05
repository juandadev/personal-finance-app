import React from "react"
import { cn } from "@/lib/utils"

interface PageHeadingProps {
  title: string
  children?: React.ReactNode
  className?: string
}

export function PageHeading({ title, children, className }: PageHeadingProps) {
  return (
    <header className={cn("flex items-center justify-between py-1", className)}>
      <h1 className="text-foreground text-[32px] font-bold tracking-tight">
        {title}
      </h1>
      {children}
    </header>
  )
}
