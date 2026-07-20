"use client"

import {
  budgetOverLimitClassName,
  formatCurrency,
  formatBudgetPercentage,
} from "@/lib/format"
import { isBudgetOverLimit } from "@/lib/finance/budget-balance"
import { themeColorClasses } from "@/lib/theme-colors"
import type { Budget } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SpendingSummaryItemProps {
  budget: Budget
}

export function SpendingSummaryItem({ budget }: SpendingSummaryItemProps) {
  const isOver = isBudgetOverLimit(budget.maximum, budget.spent)

  return (
    <li className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "block h-5 w-1 rounded-full",
            themeColorClasses[budget.color].bg,
          )}
        />
        <span className="text-foreground text-sm font-bold">
          {budget.category}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-sm font-bold",
              budgetOverLimitClassName(isOver),
            )}
          >
            {formatCurrency(budget.spent, { forceDecimals: true })}
          </span>
          <span className="text-muted-foreground text-xs">
            of {formatCurrency(budget.maximum, { forceDecimals: true })}
          </span>
        </div>
        <span className="text-muted-foreground text-xs">
          <strong className={budgetOverLimitClassName(isOver)}>
            {formatBudgetPercentage(budget.spent, budget.maximum)}
          </strong>{" "}
          spent
        </span>
      </div>
    </li>
  )
}
