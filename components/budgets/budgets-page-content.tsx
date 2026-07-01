"use client"

import { ChartPie } from "lucide-react"

import { EmptyDataCard } from "@/components/empty-data-card"
import { useFinance } from "@/hooks/use-finance"
import { formatMonthlyBudgetResetTime } from "@/lib/finance/reset-schedule"
import { AddBudgetDialog } from "./add-budget-dialog"
import { BudgetCategoryCard } from "./budget-category-card"
import { SpendingSummary } from "./spending-summary"

export function BudgetsPageContent() {
  const { budgets, transactions, state } = useFinance()
  const timezone = state.preferences.timezone
  const resetTime = formatMonthlyBudgetResetTime(timezone)

  const getTransactionsForBudget = (budgetId: string) => {
    return transactions.filter(
      (transaction) => transaction.budgetId === budgetId,
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Budgets reset on the 1st of each month at <strong>{resetTime}</strong>{" "}
        in <strong>{timezone}</strong> timezone.
      </p>
      <div className="space-y-6 lg:@[829px]/main:grid lg:@[829px]/main:grid-cols-[380px_minmax(0,1fr)] lg:@[829px]/main:gap-6 lg:@[829px]/main:space-y-0">
        <div className="lg:@[829px]/main:top-24 lg:@[829px]/main:self-start">
          <SpendingSummary />
        </div>
        <div className="flex flex-col gap-6 lg:@[829px]/main:h-[calc(100dvh-160px)] lg:@[829px]/main:overflow-y-auto lg:@[829px]/main:rounded-xl lg:@[829px]/main:pr-3">
          {budgets.length > 0 ? (
            budgets.map((budget) => (
              <BudgetCategoryCard
                key={budget.id}
                budget={budget}
                transactions={getTransactionsForBudget(budget.id)}
              />
            ))
          ) : (
            <EmptyDataCard
              className="min-h-90"
              icon={<ChartPie className="size-5" aria-hidden />}
              surface="card"
              title="Build Your First Budget"
              description="Choose a category and set a monthly limit. Once transactions are assigned, this space will show spending progress and recent activity."
              action={<AddBudgetDialog />}
            />
          )}
        </div>
      </div>
    </div>
  )
}
