import { formatCurrency } from "@/lib/format"
import { themeColorClasses } from "@/lib/theme-colors"
import type { Budget } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BudgetItemProps {
  budget: Budget
}

export function BudgetItem({ budget }: BudgetItemProps) {
  return (
    <li className="flex w-full items-center justify-start gap-4 truncate md:max-w-24.5">
      <span
        aria-hidden
        className={cn(
          "block h-10 w-1 shrink-0 rounded-full",
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
