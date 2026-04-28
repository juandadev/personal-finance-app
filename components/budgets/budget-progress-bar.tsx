interface BudgetProgressBarProps {
  spent: number
  maximum: number
  color: string
}

export function BudgetProgressBar({ spent, maximum, color }: BudgetProgressBarProps) {
  const percentage = Math.min((spent / maximum) * 100, 100)

  return (
    <div className="h-6 w-full overflow-hidden rounded-sm bg-background">
      <div
        className="h-full rounded-sm transition-all duration-300"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  )
}
