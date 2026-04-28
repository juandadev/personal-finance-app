import { formatCurrency } from "@/lib/format"
import type { Pot } from "@/lib/types"

interface PotItemProps {
  pot: Pot
}

export function PotItem({ pot }: PotItemProps) {
  return (
    <div className="flex items-center gap-4">
      <span aria-hidden className="block h-10 w-1 rounded-full" style={{ backgroundColor: pot.color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">{pot.name}</p>
        <p className="mt-1 text-sm font-bold text-foreground">{formatCurrency(pot.amount)}</p>
      </div>
    </div>
  )
}
