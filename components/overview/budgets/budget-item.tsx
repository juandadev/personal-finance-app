import { formatCurrency } from "@/lib/format"
import { themeColorClasses } from "@/lib/theme-colors"
import type { Budget } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BudgetItemProps {
  budget: Budget
}

export function BudgetItem({ budget }: BudgetItemProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className={cn(
          "block h-10 w-1 rounded-full",
          themeColorClasses[budget.color].bg,
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground truncate text-xs">
          {budget.category}
        </p>
        <p className="text-foreground mt-1 text-sm font-bold">
          {formatCurrency(budget.maximum, { forceDecimals: true })}
        </p>
      </div>
    </div>
  )
}
