import { formatCurrency } from "@/lib/format"
import { themeColorClasses } from "@/lib/theme-colors"
import type { CreditCardSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CreditCardRowProps {
  summary: CreditCardSummary
}

export function CreditCardRow({ summary }: CreditCardRowProps) {
  return (
    <li
      className={cn(
        "bg-background flex items-center justify-between rounded-r-lg border-l-5 px-4 py-5",
        themeColorClasses[summary.color].border,
      )}
    >
      <p className="text-muted-foreground text-sm">{summary.label}</p>
      <p className="text-foreground text-sm font-bold">
        {formatCurrency(summary.amount, { forceDecimals: true })}
      </p>
    </li>
  )
}
