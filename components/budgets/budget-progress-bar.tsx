import { formatBudgetPercentage } from "@/lib/format"
import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

interface BudgetProgressBarProps {
  spent: number
  maximum: number
  color: ThemeColor
}

export function BudgetProgressBar({
  spent,
  maximum,
  color,
}: BudgetProgressBarProps) {
  const percentage = maximum > 0 ? (spent / maximum) * 100 : 0
  const barPercentage = Math.min(percentage, 100)

  return (
    <div
      className="bg-background h-8 w-full overflow-hidden rounded-sm p-1"
      role="progressbar"
      aria-label="Budget spent"
      aria-valuemin={0}
      aria-valuemax={maximum}
      aria-valuenow={Math.min(spent, maximum)}
      aria-valuetext={formatBudgetPercentage(spent, maximum)}
    >
      <div
        className={cn(
          "h-full rounded-sm transition-all duration-300",
          themeColorClasses[color].bg,
        )}
        style={{ width: `${barPercentage}%` }}
      />
    </div>
  )
}
