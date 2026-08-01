import type { ReactNode } from "react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

const emptyDataCardSurfaceClasses = {
  nested: "bg-background/70",
  card: "bg-card",
} as const

interface EmptyDataCardProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
  surface?: keyof typeof emptyDataCardSurfaceClasses
}

export function EmptyDataCard({
  icon,
  title,
  description,
  action,
  className,
  surface = "nested",
}: EmptyDataCardProps) {
  return (
    <Empty
      className={cn(
        "border-border/80 min-h-60 border",
        emptyDataCardSurfaceClasses[surface],
        className,
      )}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon" className="text-muted-foreground">
          {icon}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}
