import { ReceiptText } from "lucide-react"
import { formatCurrency } from "@/lib/format"

interface TotalBillsCardProps {
  amount: number
}

export function TotalBillsCard({ amount }: TotalBillsCardProps) {
  return (
    <div className="flex lg:h-fit md:h-full flex-col rounded-xl bg-sidebar p-6 text-sidebar-primary-foreground md:flex-row md:items-center md:gap-5 lg:flex-col lg:items-start lg:gap-0">
      <div className="flex size-10 items-center justify-center rounded-lg border border-sidebar-primary-foreground/20">
        <ReceiptText className="size-5" aria-hidden />
      </div>
      <div className="mt-6 md:mt-0 lg:mt-6">
        <p className="text-sm text-sidebar-primary-foreground/80">Total Bills</p>
        <p className="mt-2 text-3xl font-bold">{formatCurrency(amount, { forceDecimals: true })}</p>
      </div>
    </div>
  )
}
