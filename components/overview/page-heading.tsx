import React from "react"

interface PageHeadingProps {
  title: string
  children?: React.ReactNode
}

export function PageHeading({ title, children }: PageHeadingProps) {
  return (
    <header className="py-1">
      <h1 className="text-foreground text-[32px] font-bold tracking-tight">
        {title}
      </h1>
      {children}
    </header>
  )
}
