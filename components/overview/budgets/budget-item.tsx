import { formatCurrency } from "@/lib/format"
import { themeColorClasses } from "@/lib/theme-colors"
import type { Budget } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BudgetItemProps {
  budget: Budget
}

export function BudgetItem({ budget }: BudgetItemProps) {
  return (
    <li className="flex items-center justify-center gap-4">
      <span
        aria-hidden
        className={cn(
          "block h-10 w-1 rounded-full",
          themeColorClasses[budget.color].bg,
        )}
      />
      <div className="flex flex-col items-start justify-center gap-1">
        <p className="text-muted-foreground truncate text-xs">
          {budget.category}
        </p>
        <p className="text-foreground text-sm font-bold">
          {formatCurrency(budget.maximum, { forceDecimals: true })}
        </p>
      </div>
    </li>
  )
}
