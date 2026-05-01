import { ReceiptText } from "lucide-react"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"

interface TotalBillsCardProps {
  amount: number
}

export function TotalBillsCard({ amount }: TotalBillsCardProps) {
  return (
    <Card
      className="total-bills-main-card flex flex-col md:h-full md:flex-row md:items-center md:gap-5"
      padding="fixed"
      variant="sidebar"
    >
      <div className="border-sidebar-primary-foreground/20 flex size-10 items-center justify-center rounded-lg border">
        <ReceiptText className="size-5" aria-hidden />
      </div>
      <div className="total-bills-main-copy mt-6 md:mt-0">
        <p className="text-sidebar-primary-foreground/80 text-sm">
          Total Bills
        </p>
        <p className="mt-2 text-3xl font-bold">
          {formatCurrency(amount, { forceDecimals: true })}
        </p>
      </div>
    </Card>
  )
}
