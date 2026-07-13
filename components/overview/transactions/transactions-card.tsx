"use client"

import Link from "next/link"
import { CaretRightIcon, ReceiptIcon } from "@phosphor-icons/react"
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  cardActionLinkClasses,
} from "@/components/ui/card"
import { EmptyDataCard } from "@/components/empty-data-card"
import { useFinance } from "@/hooks/use-finance"
import { TransactionItem } from "./transaction-item"

export function TransactionsCard() {
  const { transactions } = useFinance()
  const hasTransactions = transactions.length > 0

  return (
    <Card asChild>
      <section>
        <CardHeader>
          <CardTitle>
            <h2>Transactions</h2>
          </CardTitle>
          <CardAction>
            <Link href="/transactions" className={cardActionLinkClasses}>
              View All
              <CaretRightIcon weight="fill" className="size-3" aria-hidden />
            </Link>
          </CardAction>
        </CardHeader>

        {hasTransactions ? (
          <ul className="divide-muted-foreground/10 mt-8 divide-y">
            {transactions.slice(0, 5).map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </ul>
        ) : (
          <EmptyDataCard
            className="mt-8 min-h-45 p-5 md:p-6"
            icon={<ReceiptIcon weight="fill" className="size-5" aria-hidden />}
            title="No Transactions Yet"
            description="There is no transaction data available to show yet."
          />
        )}
      </section>
    </Card>
  )
}
