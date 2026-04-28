import { transactions } from "@/lib/data"
import { CardHeader } from "../card-header"
import { TransactionItem } from "./transaction-item"

export function TransactionsCard() {
  return (
    <section className="rounded-xl bg-card p-6 shadow-sm md:p-8">
      <CardHeader title="Transactions" actionLabel="View All" href="/transactions" />

      <ul className="mt-2 divide-y divide-border">
        {transactions.slice(0, 5).map((transaction) => (
          <li key={transaction.id}>
            <TransactionItem transaction={transaction} />
          </li>
        ))}
      </ul>
    </section>
  )
}
