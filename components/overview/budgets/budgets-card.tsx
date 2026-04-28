"use client"

import { useFinance } from "@/hooks/use-finance"
import { CardHeader } from "../card-header"
import { BudgetItem } from "./budget-item"
import { BudgetsChart } from "./budgets-chart"

export function BudgetsCard() {
  const { budgets, budgetSpent, budgetLimit } = useFinance()

  return (
    <section className="rounded-xl bg-card p-6 shadow-sm md:p-8">
      <CardHeader title="Budgets" actionLabel="See Details" href="/budgets" />

      <div className="mt-6 grid items-center gap-6 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <BudgetsChart budgets={budgets} spent={budgetSpent} limit={budgetLimit} />

        <ul className="grid grid-cols-1 gap-4">
          {budgets.map((b) => (
            <li key={b.category}>
              <BudgetItem budget={b} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
