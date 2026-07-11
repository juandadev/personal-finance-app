import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import type { RecurringBillSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BillsSummaryCardProps {
  summary: RecurringBillSummary[]
}

interface SummaryRowProps {
  label: string
  count: number
  amount: number
  variant?: "default" | "warning"
}

function SummaryRow({
  label,
  count,
  amount,
  variant = "default",
}: SummaryRowProps) {
  return (
    <div className="border-muted-foreground/10 flex items-center justify-between border-b py-4 last:border-b-0">
      <span
        className={cn(
          "text-sm",
          variant === "warning" ? "text-warning" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-bold",
          variant === "warning" ? "text-warning" : "text-foreground",
        )}
      >
        {count} ({formatCurrency(amount, { forceDecimals: true })})
      </span>
    </div>
  )
}

export function BillsSummaryCard({ summary }: BillsSummaryCardProps) {
  return (
    <Card className="h-fit" padding="fixed">
      <CardHeader>
        <CardTitle size="sm">
          <h3>Summary</h3>
        </CardTitle>
      </CardHeader>
      <div className="mt-2">
        {summary.map((row) => (
          <SummaryRow
            key={row.label}
            label={row.label}
            count={row.count}
            amount={row.amount}
            variant={row.label === "Due Soon" ? "warning" : "default"}
          />
        ))}
      </div>
    </Card>
  )
}
