import { formatCurrency } from "@/lib/format"
import { themeColorClasses } from "@/lib/theme-colors"
import type { RecurringBillSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BillRowProps {
  bill: RecurringBillSummary
}

export function BillRow({ bill }: BillRowProps) {
  return (
    <li
      className={cn(
        "bg-background flex items-center justify-between rounded-lg border-l-4 px-4 py-5",
        themeColorClasses[bill.color].border,
      )}
    >
      <p className="text-muted-foreground text-sm">{bill.label}</p>
      <p className="text-foreground text-sm font-bold">
        {formatCurrency(bill.amount, { forceDecimals: true })}
      </p>
    </li>
  )
}
