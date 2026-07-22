"use client"

import Link from "next/link"
import { CaretRightIcon } from "@phosphor-icons/react"
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  cardActionLinkClasses,
} from "@/components/ui/card"
import { MoneyAmount } from "@/components/money-amount"
import { useFinance } from "@/hooks/use-finance"
import { BudgetItem } from "./budget-item"
import { BudgetsChart } from "./budgets-chart"

export function BudgetsCard() {
  const { budgets, budgetSpent, budgetLimit } = useFinance()
  const hasBudgets = budgets.length > 0

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
              <CaretRightIcon weight="fill" className="size-3" aria-hidden />
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
            {hasBudgets ? (
              budgets.map((b) => <BudgetItem key={b.id} budget={b} />)
            ) : (
              <GhostBudgetItem />
            )}
          </ul>
        </div>
      </section>
    </Card>
  )
}

function GhostBudgetItem() {
  return (
    <li className="border-border/80 bg-background/70 col-span-2 flex w-full items-center justify-start gap-4 rounded-lg border border-dashed p-4 md:col-span-1 md:max-w-31">
      <span
        aria-hidden
        className="bg-muted-foreground/25 block h-10 w-1 shrink-0 rounded-full"
      />
      <div className="flex min-w-0 flex-col items-start justify-center gap-1">
        <p className="text-muted-foreground text-xs">Empty</p>
        <p className="text-foreground text-sm font-bold">
          <MoneyAmount amount={0} forceDecimals />
        </p>
      </div>
    </li>
  )
}
