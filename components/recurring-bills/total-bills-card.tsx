import { ReceiptText } from "lucide-react"
import { formatCurrency } from "@/lib/format"

interface TotalBillsCardProps {
  amount: number
}

export function TotalBillsCard({ amount }: TotalBillsCardProps) {
  return (
    <div className="bg-sidebar text-sidebar-primary-foreground flex flex-col rounded-xl p-6 md:h-full md:flex-row md:items-center md:gap-5 lg:h-fit lg:flex-col lg:items-start lg:gap-0">
      <div className="border-sidebar-primary-foreground/20 flex size-10 items-center justify-center rounded-lg border">
        <ReceiptText className="size-5" aria-hidden />
      </div>
      <div className="mt-6 md:mt-0 lg:mt-6">
        <p className="text-sidebar-primary-foreground/80 text-sm">
          Total Bills
        </p>
        <p className="mt-2 text-3xl font-bold">
          {formatCurrency(amount, { forceDecimals: true })}
        </p>
      </div>
    </div>
  )
}
