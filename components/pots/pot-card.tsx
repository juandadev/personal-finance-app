import { MoreHorizontal } from "lucide-react"
import type { Pot } from "@/lib/types"
import { formatCurrency } from "@/lib/format"
import { PotProgressBar } from "./pot-progress-bar"

interface PotCardProps {
  pot: Pot
}

export function PotCard({ pot }: PotCardProps) {
  const percentage = (pot.amount / pot.target) * 100

  return (
    <article className="bg-card rounded-xl p-5 shadow-sm md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="block size-4 rounded-full"
            style={{ backgroundColor: pot.color }}
          />
          <h3 className="text-card-foreground text-xl font-bold">{pot.name}</h3>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-card-foreground transition-colors"
          aria-label={`More options for ${pot.name}`}
        >
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      {/* Amount */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Total Saved</span>
        <span className="text-card-foreground text-3xl font-bold">
          {formatCurrency(pot.amount, { forceDecimals: true })}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <PotProgressBar percentage={percentage} color={pot.color} />
      </div>

      {/* Progress Info */}
      <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
        <span>{percentage.toFixed(percentage < 10 ? 2 : 1)}%</span>
        <span>Target of {formatCurrency(pot.target)}</span>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          className="bg-background text-card-foreground hover:bg-muted rounded-lg px-4 py-3 text-sm font-bold transition-colors"
        >
          + Add Money
        </button>
        <button
          type="button"
          className="bg-background text-card-foreground hover:bg-muted rounded-lg px-4 py-3 text-sm font-bold transition-colors"
        >
          Withdraw
        </button>
      </div>
    </article>
  )
}
