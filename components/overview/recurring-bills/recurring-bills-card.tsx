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
import { BillRow } from "./bill-row"

export function RecurringBillsCard() {
  const { recurringBillsSummary } = useFinance()

  return (
    <Card asChild padding="overview" className="flex-1">
      <section>
        <CardHeader>
          <CardTitle>
            <h2>Recurring Bills</h2>
          </CardTitle>
          <CardAction>
            <Link href="/recurring-bills" className={cardActionLinkClasses}>
              See Details
              <CaretRightIcon className="size-2" aria-hidden />
            </Link>
          </CardAction>
        </CardHeader>

        <ul className="mt-8 flex flex-col gap-3">
          {recurringBillsSummary.map((bill) => (
            <BillRow bill={bill} key={bill.label} />
          ))}
        </ul>
      </section>
    </Card>
  )
}
