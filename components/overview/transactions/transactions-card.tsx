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
import { TransactionItem } from "./transaction-item"

export function TransactionsCard() {
  const { transactions } = useFinance()

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

        <ul className="divide-finance-grey-100 mt-8 divide-y">
          {transactions.slice(0, 5).map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </ul>
      </section>
    </Card>
  )
}
