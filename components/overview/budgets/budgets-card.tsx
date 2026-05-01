"use client"

import { Card } from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import { CardHeader } from "../card-header"
import { BudgetItem } from "./budget-item"
import { BudgetsChart } from "./budgets-chart"

export function BudgetsCard() {
  const { budgets, budgetSpent, budgetLimit } = useFinance()

  return (
    <Card asChild padding="overview">
      <section>
        <CardHeader title="Budgets" actionLabel="See Details" href="/budgets" />

        <div className="mt-7 flex items-center gap-4 self-stretch">
          <BudgetsChart
            budgets={budgets}
            spent={budgetSpent}
            limit={budgetLimit}
          />

          <ul className="flex flex-col items-start justify-center gap-4">
            {budgets.map((b) => (
              <BudgetItem key={b.category} budget={b} />
            ))}
          </ul>
        </div>
      </section>
    </Card>
  )
}
