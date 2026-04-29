"use client"

import { useFinance } from "@/hooks/use-finance"
import { CardHeader } from "../card-header"
import { TransactionItem } from "./transaction-item"

export function TransactionsCard() {
  const { transactions } = useFinance()

  return (
    <section className="bg-card rounded-xl p-6 shadow-sm md:p-8">
      <CardHeader
        title="Transactions"
        actionLabel="View All"
        href="/transactions"
      />

      <ul className="divide-border mt-2 divide-y">
        {transactions.slice(0, 5).map((transaction) => (
          <li key={transaction.id}>
            <TransactionItem transaction={transaction} />
          </li>
        ))}
      </ul>
    </section>
  )
}
