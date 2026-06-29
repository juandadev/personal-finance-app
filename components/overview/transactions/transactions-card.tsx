"use client"

import Link from "next/link"
import { ReceiptText } from "lucide-react"
import CaretRightIcon from "@/components/icons/CaretRightIcon"
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
    <Card asChild className="flex-1">
      <section>
        <CardHeader>
          <CardTitle>
            <h2>Transactions</h2>
          </CardTitle>
          <CardAction>
            <Link href="/transactions" className={cardActionLinkClasses}>
              View All
              <CaretRightIcon className="size-2" aria-hidden />
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
            icon={<ReceiptText className="size-5" aria-hidden />}
            title="No Transactions Yet"
            description="There is no transaction data available to show yet."
          />
        )}
      </section>
    </Card>
  )
}
