"use client"

import { useFinance } from "@/hooks/use-finance"
import { BudgetsChart } from "@/components/overview/budgets/budgets-chart"
import { SpendingSummaryItem } from "./spending-summary-item"

export function SpendingSummary() {
  const { budgets, budgetSpent, budgetLimit } = useFinance()

  return (
    <section className="rounded-xl bg-card p-5 md:p-8">
      {/* Mobile: stack vertically */}
      <div className="flex flex-col items-center gap-6 md:hidden">
        <BudgetsChart budgets={budgets} spent={budgetSpent} limit={budgetLimit} />
        <div className="w-full">
          <h2 className="text-lg font-bold text-foreground">Spending Summary</h2>
          <ul className="mt-4 divide-y divide-muted-foreground/10">
            {budgets.map((budget) => (
              <li key={budget.category}>
                <SpendingSummaryItem budget={budget} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tablet: side by side */}
      <div className="hidden md:flex md:items-center md:gap-8 lg:hidden">
        <div className="w-1/2">
          <BudgetsChart budgets={budgets} spent={budgetSpent} limit={budgetLimit} />
        </div>
        <div className="w-1/2">
          <h2 className="text-lg font-bold text-foreground">Spending Summary</h2>
          <ul className="mt-4 divide-y divide-muted-foreground/10">
            {budgets.map((budget) => (
              <li key={budget.category}>
                <SpendingSummaryItem budget={budget} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Desktop: chart on top, summary below */}
      <div className="hidden lg:block">
        <div className="flex justify-center">
          <BudgetsChart budgets={budgets} spent={budgetSpent} limit={budgetLimit} />
        </div>
        <h2 className="mt-8 text-lg font-bold text-foreground">Spending Summary</h2>
        <ul className="mt-4 divide-y divide-muted-foreground/10">
          {budgets.map((budget) => (
            <li key={budget.category}>
              <SpendingSummaryItem budget={budget} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
