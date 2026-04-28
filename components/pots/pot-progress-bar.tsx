interface PotProgressBarProps {
  percentage: number
  color: string
}

export function PotProgressBar({ percentage, color }: PotProgressBarProps) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-background">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${Math.min(percentage, 100)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  )
}
