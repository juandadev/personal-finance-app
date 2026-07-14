import { ReceiptIcon } from "@phosphor-icons/react"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"

interface TotalBillsCardProps {
  amount: number
}

export function TotalBillsCard({ amount }: TotalBillsCardProps) {
  return (
    <Card
      className="flex gap-3 md:h-full md:items-center md:gap-5 lg:@[829px]/main:h-fit lg:@[829px]/main:flex-col lg:@[829px]/main:items-start lg:@[829px]/main:gap-0"
      padding="fixed"
      variant="sidebar"
    >
      <div className="flex items-center justify-center">
        <ReceiptIcon weight="light" className="size-10" aria-hidden />
      </div>
      <div className="md:mt-0 lg:@[829px]/main:mt-6">
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
