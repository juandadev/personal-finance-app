import { formatCurrency } from "@/lib/format"
import type { Budget } from "@/lib/types"

interface BudgetItemProps {
  budget: Budget
}

export function BudgetItem({ budget }: BudgetItemProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="block h-10 w-1 rounded-full"
        style={{ backgroundColor: budget.color }}
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
