import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/overview/page-heading"
import { SpendingSummary } from "@/components/budgets/spending-summary"
import { BudgetCategoryCard } from "@/components/budgets/budget-category-card"
import { budgets, transactions } from "@/lib/data"
import type { TransactionCategory } from "@/lib/types"

export default function BudgetsPage() {
  // Get transactions for a specific category (only negative amounts = spending)
  const getTransactionsForCategory = (category: TransactionCategory) => {
    return transactions.filter(
      (t) => t.category === category && t.amount < 0
    )
  }

  return (
    <AppShell activeKey="budgets">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 -mx-4 -mt-6 flex items-center justify-between bg-background px-4 py-4 md:-mx-10 md:-mt-8 md:px-10 md:py-6">
        <PageHeading title="Budgets" />
        <button
          type="button"
          className="rounded-lg bg-sidebar px-4 py-3 text-sm font-bold text-sidebar-primary-foreground transition-colors hover:bg-sidebar/90"
        >
          + Add New Budget
        </button>
      </div>

      {/* Main Content */}
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
    </AppShell>
  )
}
