"use client"

import { formatCurrency } from "@/lib/format"
import type { Budget } from "@/lib/types"

interface SpendingSummaryItemProps {
  budget: Budget
}

export function SpendingSummaryItem({ budget }: SpendingSummaryItemProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="block h-5 w-1 rounded-full"
          style={{ backgroundColor: budget.color }}
        />
        <span className="text-sm text-muted-foreground">{budget.category}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold text-foreground">
          {formatCurrency(budget.spent, { forceDecimals: true })}
        </span>
        <span className="text-xs text-muted-foreground">
          of {formatCurrency(budget.maximum, { forceDecimals: true })}
        </span>
      </div>
    </div>
  )
}
