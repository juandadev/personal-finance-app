import Link from "next/link"
import { MoreHorizontal, ChevronRight } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import type { Budget, Transaction } from "@/lib/types"
import { BudgetProgressBar } from "./budget-progress-bar"
import { LatestSpendingItem } from "./latest-spending-item"

interface BudgetCategoryCardProps {
  budget: Budget
  transactions: Transaction[]
}

export function BudgetCategoryCard({ budget, transactions }: BudgetCategoryCardProps) {
  const remaining = Math.max(budget.maximum - budget.spent, 0)
  const latestTransactions = transactions.slice(0, 3)

  return (
    <section className="rounded-xl bg-card p-5 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="size-4 rounded-full"
            style={{ backgroundColor: budget.color }}
          />
          <h2 className="text-xl font-bold text-foreground">{budget.category}</h2>
        </div>
        <button
          type="button"
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`More options for ${budget.category}`}
        >
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      {/* Maximum */}
      <p className="mt-4 text-sm text-muted-foreground">
        Maximum of {formatCurrency(budget.maximum, { forceDecimals: true })}
      </p>

      {/* Progress Bar */}
      <div className="mt-4">
        <BudgetProgressBar spent={budget.spent} maximum={budget.maximum} color={budget.color} />
      </div>

      {/* Spent / Remaining */}
      <div className="mt-4 flex">
        <div className="flex-1 border-l-4 pl-3" style={{ borderColor: budget.color }}>
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {formatCurrency(budget.spent, { forceDecimals: true })}
          </p>
        </div>
        <div className="flex-1 border-l-4 border-background pl-3">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {formatCurrency(remaining, { forceDecimals: true })}
          </p>
        </div>
      </div>

      {/* Latest Spending */}
      <div className="mt-6 rounded-lg bg-background p-4 md:p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground">Latest Spending</h3>
          <Link
            href={`/transactions?category=${encodeURIComponent(budget.category)}`}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            See All
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="mt-2 divide-y divide-muted-foreground/10">
          {latestTransactions.map((transaction) => (
            <li key={transaction.id}>
              <LatestSpendingItem transaction={transaction} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
