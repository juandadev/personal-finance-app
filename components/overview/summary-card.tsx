import { Card } from "@/components/ui/card"
import { MoneyAmount } from "@/components/money-amount"
import { cn } from "@/lib/utils"
import type { SummaryStat } from "@/lib/types"

interface SummaryCardProps {
  stat: SummaryStat
}

export function SummaryCard({ stat }: SummaryCardProps) {
  const isPrimary = stat.variant === "primary"

  return (
    <Card padding="overview" variant={isPrimary ? "primary" : "default"}>
      <p
        className={cn(
          "text-sm",
          isPrimary ? "text-primary-foreground" : "text-muted-foreground",
        )}
      >
        {stat.label}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight">
        <MoneyAmount
          amount={stat.amount}
          expandedClassName={
            isPrimary ? "bg-primary text-primary-foreground" : undefined
          }
        />
      </p>
    </Card>
  )
}
