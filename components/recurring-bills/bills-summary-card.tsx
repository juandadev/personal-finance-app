import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import type { RecurringBill } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BillsSummaryCardProps {
  bills: RecurringBill[]
}

interface SummaryRowProps {
  label: string
  count: number
  amount: number
  variant?: "default" | "danger"
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
          variant === "danger" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-bold",
          variant === "danger" ? "text-destructive" : "text-card-foreground",
        )}
      >
        {count} ({formatCurrency(amount, { forceDecimals: true })})
      </span>
    </div>
  )
}

export function BillsSummaryCard({ bills }: BillsSummaryCardProps) {
  const paidBills = bills.filter((b) => b.status === "paid")
  const upcomingBills = bills.filter(
    (b) => b.status === "upcoming" || b.status === "due-soon",
  )
  const dueSoonBills = bills.filter((b) => b.status === "due-soon")

  const paidAmount = paidBills.reduce((sum, b) => sum + b.amount, 0)
  const upcomingAmount = upcomingBills.reduce((sum, b) => sum + b.amount, 0)
  const dueSoonAmount = dueSoonBills.reduce((sum, b) => sum + b.amount, 0)

  return (
    <Card className="h-fit" padding="fixed">
      <h3 className="text-card-foreground text-base font-bold">Summary</h3>
      <div className="mt-2">
        <SummaryRow
          label="Paid Bills"
          count={paidBills.length}
          amount={paidAmount}
        />
        <SummaryRow
          label="Total Upcoming"
          count={upcomingBills.length}
          amount={upcomingAmount}
        />
        <SummaryRow
          label="Due Soon"
          count={dueSoonBills.length}
          amount={dueSoonAmount}
          variant="danger"
        />
      </div>
    </Card>
  )
}
