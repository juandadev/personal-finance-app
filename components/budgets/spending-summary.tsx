"use client"

import { Card } from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import { BudgetsChart } from "@/components/overview/budgets/budgets-chart"
import { SpendingSummaryItem } from "./spending-summary-item"

export function SpendingSummary() {
  const { budgets, budgetSpent, budgetLimit } = useFinance()

  return (
    <Card asChild>
      <section className="flex flex-col items-center gap-8 md:flex-row md:gap-8 lg:@[829px]/main:block">
        <div className="w-full md:w-1/2 lg:@[829px]/main:flex lg:@[829px]/main:w-full lg:@[829px]/main:justify-center">
          <BudgetsChart
            budgets={budgets}
            spent={budgetSpent}
            limit={budgetLimit}
          />
        </div>
        <div className="w-full md:w-1/2 lg:@[829px]/main:mt-8 lg:@[829px]/main:w-full">
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            Spending Summary
          </h2>
          <ul className="divide-muted-foreground/10 mt-6 divide-y md:mt-4">
            {budgets.map((budget) => (
              <SpendingSummaryItem key={budget.category} budget={budget} />
            ))}
          </ul>
        </div>
      </section>
    </Card>
  )
}
