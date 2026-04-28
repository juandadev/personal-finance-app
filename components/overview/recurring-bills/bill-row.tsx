import { formatCurrency } from "@/lib/format"
import type { RecurringBillSummary } from "@/lib/types"

interface BillRowProps {
  bill: RecurringBillSummary
}

export function BillRow({ bill }: BillRowProps) {
  return (
    <div
      className="flex items-center justify-between rounded-lg bg-background px-4 py-4"
      style={{ boxShadow: `inset 4px 0 0 0 ${bill.color}` }}
    >
      <p className="text-sm text-muted-foreground">{bill.label}</p>
      <p className="text-sm font-bold text-foreground">
        {formatCurrency(bill.amount, { forceDecimals: true })}
      </p>
    </div>
  )
}
