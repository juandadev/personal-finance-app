"use client"

import { Card } from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import { CardHeader } from "../card-header"
import { TransactionItem } from "./transaction-item"

export function TransactionsCard() {
  const { transactions } = useFinance()

  return (
    <Card asChild padding="overview" className="flex-1">
      <section>
        <CardHeader
          title="Transactions"
          actionLabel="View All"
          href="/transactions"
        />

        <ul className="divide-border mt-8 divide-y">
          {transactions.slice(0, 5).map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </ul>
      </section>
    </Card>
  )
}
