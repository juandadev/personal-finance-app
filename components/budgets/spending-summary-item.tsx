"use client"

import { formatCurrency } from "@/lib/format"
import { themeColorClasses } from "@/lib/theme-colors"
import type { Budget } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SpendingSummaryItemProps {
  budget: Budget
}

export function SpendingSummaryItem({ budget }: SpendingSummaryItemProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "block h-5 w-1 rounded-full",
            themeColorClasses[budget.color].bg,
          )}
        />
        <span className="text-muted-foreground text-sm">{budget.category}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-foreground text-sm font-bold">
          {formatCurrency(budget.spent, { forceDecimals: true })}
        </span>
        <span className="text-muted-foreground text-xs">
          of {formatCurrency(budget.maximum, { forceDecimals: true })}
        </span>
      </div>
    </div>
  )
}
