"use client"

import { Card } from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import { BudgetsChart } from "@/components/overview/budgets/budgets-chart"
import { SpendingSummaryItem } from "./spending-summary-item"

export function SpendingSummary() {
  const { budgets, budgetSpent, budgetLimit } = useFinance()
  const hasBudgets = budgets.length > 0

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
            {hasBudgets ? (
              budgets.map((budget) => (
                <SpendingSummaryItem key={budget.id} budget={budget} />
              ))
            ) : (
              <li className="py-4">
                <div className="border-border/80 bg-background/70 rounded-lg border border-dashed p-4">
                  <p className="text-foreground text-sm font-bold">
                    No budgets created
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Your spending summary will fill in after you add a budget.
                  </p>
                </div>
              </li>
            )}
          </ul>
        </div>
      </section>
    </Card>
  )
}
