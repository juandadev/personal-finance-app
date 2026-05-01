import { formatCurrency } from "@/lib/format"
import { themeColorClasses } from "@/lib/theme-colors"
import type { Pot } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PotItemProps {
  pot: Pot
}

export function PotItem({ pot }: PotItemProps) {
  return (
    <li className="flex items-center gap-4">
      <span
        aria-hidden
        className={cn(
          "block h-10 w-1 rounded-full",
          themeColorClasses[pot.color].bg,
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground truncate text-xs">{pot.name}</p>
        <p className="text-foreground mt-1 text-sm font-bold">
          {formatCurrency(pot.amount)}
        </p>
      </div>
    </li>
  )
}
