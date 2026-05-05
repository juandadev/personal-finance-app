"use client"

import { Card } from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import { BudgetsChart } from "@/components/overview/budgets/budgets-chart"
import { SpendingSummaryItem } from "./spending-summary-item"

export function SpendingSummary() {
  const { budgets, budgetSpent, budgetLimit } = useFinance()

  return (
    <Card asChild>
      <section>
        {/* Mobile: stack vertically */}
        <div className="flex flex-col items-center gap-8 md:hidden">
          <BudgetsChart
            budgets={budgets}
            spent={budgetSpent}
            limit={budgetLimit}
          />
          <div className="w-full">
            <h2 className="text-foreground text-xl font-bold">
              Spending Summary
            </h2>
            <ul className="divide-muted-foreground/10 mt-6 divide-y">
              {budgets.map((budget) => (
                <SpendingSummaryItem key={budget.category} budget={budget} />
              ))}
            </ul>
          </div>
        </div>

        {/* Tablet: side by side */}
        <div className="hidden md:flex md:items-center md:gap-8 lg:@[829px]/main:hidden">
          <div className="w-1/2">
            <BudgetsChart
              budgets={budgets}
              spent={budgetSpent}
              limit={budgetLimit}
            />
          </div>
          <div className="w-1/2">
            <h2 className="text-foreground text-lg font-bold">
              Spending Summary
            </h2>
            <ul className="divide-muted-foreground/10 mt-4 divide-y">
              {budgets.map((budget) => (
                <SpendingSummaryItem key={budget.category} budget={budget} />
              ))}
            </ul>
          </div>
        </div>

        {/* Desktop: chart on top, summary below */}
        <div className="hidden lg:@[829px]/main:block">
          <div className="flex justify-center">
            <BudgetsChart
              budgets={budgets}
              spent={budgetSpent}
              limit={budgetLimit}
            />
          </div>
          <h2 className="text-foreground mt-8 text-lg font-bold">
            Spending Summary
          </h2>
          <ul className="divide-muted-foreground/10 mt-4 divide-y">
            {budgets.map((budget) => (
              <li key={budget.category}>
                <SpendingSummaryItem budget={budget} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Card>
  )
}
