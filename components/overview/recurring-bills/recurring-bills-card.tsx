"use client"

import { Card } from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import { CardHeader } from "../card-header"
import { BillRow } from "./bill-row"

export function RecurringBillsCard() {
  const { recurringBillsSummary } = useFinance()

  return (
    <Card asChild padding="overview">
      <section>
        <CardHeader
          title="Recurring Bills"
          actionLabel="See Details"
          href="/recurring-bills"
        />

        <ul className="mt-6 flex flex-col gap-3">
          {recurringBillsSummary.map((bill) => (
            <li key={bill.label}>
              <BillRow bill={bill} />
            </li>
          ))}
        </ul>
      </section>
    </Card>
  )
}
