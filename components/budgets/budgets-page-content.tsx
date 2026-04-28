"use client"

import { useFinance } from "@/hooks/use-finance"
import type { TransactionCategory } from "@/lib/types"
import { BudgetCategoryCard } from "./budget-category-card"
import { SpendingSummary } from "./spending-summary"

export function BudgetsPageContent() {
  const { budgets, transactions } = useFinance()

  const getTransactionsForCategory = (category: TransactionCategory) => {
    return transactions.filter((transaction) => transaction.category === category && transaction.amount < 0)
  }

  return (
    <div className="lg:ml-[404px]">
      {/* Left Column: Spending Summary - Fixed on desktop */}
      <div className="lg:fixed lg:left-[300px] lg:mb-0 lg:w-[380px]">
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
