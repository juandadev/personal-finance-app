import { ReceiptText } from "lucide-react"
import { formatCurrency } from "@/lib/format"

interface TotalBillsCardProps {
  amount: number
}

export function TotalBillsCard({ amount }: TotalBillsCardProps) {
  return (
    <div className="flex items-center gap-5 rounded-xl bg-sidebar p-6 text-sidebar-primary-foreground">
      <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary-foreground/10 md:size-12">
        <ReceiptText className="size-5 md:size-6" aria-hidden />
      </div>
      <div>
        <p className="text-sm text-sidebar-primary-foreground/80">Total Bills</p>
        <p className="mt-1 text-3xl font-bold">{formatCurrency(amount, { forceDecimals: true })}</p>
      </div>
    </div>
  )
}
