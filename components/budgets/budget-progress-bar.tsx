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
  const percentage = Math.min((spent / maximum) * 100, 100)

  return (
    <div className="bg-background h-8 w-full overflow-hidden rounded-sm p-1">
      <div
        className={cn(
          "h-full rounded-sm transition-all duration-300",
          themeColorClasses[color].bg,
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
