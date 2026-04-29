interface BudgetProgressBarProps {
  spent: number
  maximum: number
  color: string
}

export function BudgetProgressBar({
  spent,
  maximum,
  color,
}: BudgetProgressBarProps) {
  const percentage = Math.min((spent / maximum) * 100, 100)

  return (
    <div className="bg-background h-6 w-full overflow-hidden rounded-sm">
      <div
        className="h-full rounded-sm transition-all duration-300"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  )
}
