"use client"

import { ChartPieIcon } from "@phosphor-icons/react"

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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <p className="text-muted-foreground shrink-0 text-sm">
        Budgets reset on the 1st of each month at <strong>{resetTime}</strong>{" "}
        in <strong>{timezone}</strong> timezone.
      </p>
      <div className="grid min-h-0 flex-1 gap-6 lg:@[829px]/main:grid-cols-[380px_minmax(0,1fr)]">
        <div className="lg:@[829px]/main:self-start">
          <SpendingSummary />
        </div>
        <div className="flex min-h-0 flex-col gap-6 overflow-y-auto rounded-xl lg:pr-3">
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
              icon={
                <ChartPieIcon weight="fill" className="size-5" aria-hidden />
              }
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
