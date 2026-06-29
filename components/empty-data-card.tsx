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

interface EmptyDataCardProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyDataCard({
  icon,
  title,
  description,
  action,
  className,
}: EmptyDataCardProps) {
  return (
    <Empty
      className={cn(
        "border-border/80 bg-background/70 min-h-60 border",
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
