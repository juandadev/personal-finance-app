import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

interface PotProgressBarProps {
  percentage: number
  color: ThemeColor
  highlighted: boolean
}

export function PotProgressBar({
  percentage,
  color,
  highlighted,
}: PotProgressBarProps) {
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full",
        highlighted ? "bg-current/30" : "bg-background",
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          highlighted ? "bg-current" : themeColorClasses[color].bg,
        )}
        style={{
          width: `${Math.min(percentage, 100)}%`,
        }}
      />
    </div>
  )
}
