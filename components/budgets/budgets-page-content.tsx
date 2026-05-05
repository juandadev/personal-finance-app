"use client"

import { useFinance } from "@/hooks/use-finance"
import type { TransactionCategory } from "@/lib/types"
import { BudgetCategoryCard } from "./budget-category-card"
import { SpendingSummary } from "./spending-summary"

export function BudgetsPageContent() {
  const { budgets, transactions } = useFinance()

  const getTransactionsForCategory = (category: TransactionCategory) => {
    return transactions.filter(
      (transaction) =>
        transaction.category === category && transaction.amount < 0,
    )
  }

  return (
    <div className="lg:@[829px]/main:grid lg:@[829px]/main:grid-cols-[380px_minmax(0,1fr)] lg:@[829px]/main:gap-6">
      {/* Left Column: Spending Summary */}
      <div className="lg:@[829px]/main:sticky lg:@[829px]/main:top-24 lg:@[829px]/main:self-start">
        <SpendingSummary />
      </div>

      {/* Right Column: Budget Cards */}
      <div className="flex flex-col gap-6">
        {budgets.map((budget) => (
          <BudgetCategoryCard
            key={budget.category}
            budget={budget}
            transactions={getTransactionsForCategory(budget.category)}
          />
        ))}
      </div>
    </div>
  )
}
