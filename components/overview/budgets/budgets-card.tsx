"use client"

import Link from "next/link"
import CaretRightIcon from "@/components/icons/CaretRightIcon"
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  cardActionLinkClasses,
} from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import { BudgetItem } from "./budget-item"
import { BudgetsChart } from "./budgets-chart"

export function BudgetsCard() {
  const { budgets, budgetSpent, budgetLimit } = useFinance()

  return (
    <Card asChild>
      <section>
        <CardHeader>
          <CardTitle>
            <h2>Budgets</h2>
          </CardTitle>
          <CardAction>
            <Link href="/budgets" className={cardActionLinkClasses}>
              See Details
              <CaretRightIcon className="size-2" aria-hidden />
            </Link>
          </CardAction>
        </CardHeader>
        <div className="mt-7 flex flex-col items-center gap-4 self-stretch py-2 md:flex-row">
          <BudgetsChart
            budgets={budgets}
            spent={budgetSpent}
            limit={budgetLimit}
          />
          <ul className="grid w-full grid-cols-2 justify-items-start gap-4 md:h-full md:max-h-75.5 md:w-fit md:max-w-31 md:grid-cols-1 md:overflow-y-auto md:pr-2">
            {budgets.map((b) => (
              <BudgetItem key={b.category} budget={b} />
            ))}
          </ul>
        </div>
      </section>
    </Card>
  )
}
