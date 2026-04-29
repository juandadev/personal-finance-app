import { formatCurrency } from "@/lib/format"
import type { RecurringBillSummary } from "@/lib/types"

interface BillRowProps {
  bill: RecurringBillSummary
}

export function BillRow({ bill }: BillRowProps) {
  return (
    <div
      className="bg-background flex items-center justify-between rounded-lg px-4 py-4"
      style={{ boxShadow: `inset 4px 0 0 0 ${bill.color}` }}
    >
      <p className="text-muted-foreground text-sm">{bill.label}</p>
      <p className="text-foreground text-sm font-bold">
        {formatCurrency(bill.amount, { forceDecimals: true })}
      </p>
    </div>
  )
}
