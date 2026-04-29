import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"
import type { SummaryStat } from "@/lib/types"

interface SummaryCardProps {
  stat: SummaryStat
}

export function SummaryCard({ stat }: SummaryCardProps) {
  const isPrimary = stat.variant === "primary"

  return (
    <div
      className={cn(
        "rounded-xl p-6 shadow-sm",
        isPrimary
          ? "bg-primary text-primary-foreground"
          : "bg-card text-card-foreground",
      )}
    >
      <p
        className={cn(
          "text-sm",
          isPrimary ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {stat.label}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight">
        {formatCurrency(stat.amount, { forceDecimals: true })}
      </p>
    </div>
  )
}
