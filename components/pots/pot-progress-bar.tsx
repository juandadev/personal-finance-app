import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

interface PotProgressBarProps {
  percentage: number
  color: ThemeColor
}

export function PotProgressBar({ percentage, color }: PotProgressBarProps) {
  return (
    <div className="bg-background h-2 w-full overflow-hidden rounded-full">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          themeColorClasses[color].bg,
        )}
        style={{
          width: `${Math.min(percentage, 100)}%`,
        }}
      />
    </div>
  )
}
