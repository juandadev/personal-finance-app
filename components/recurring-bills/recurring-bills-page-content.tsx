"use client"

import { useFinance } from "@/hooks/use-finance"
import { BillsContent } from "./bills-content"
import { BillsSummaryCard } from "./bills-summary-card"
import { TotalBillsCard } from "./total-bills-card"

export function RecurringBillsPageContent() {
  const { recurringBills, recurringBillsSummary, totalBillsAmount } =
    useFinance()

  return (
    <div className="mt-6 flex flex-col gap-6 lg:@[829px]/main:flex-row">
      <div className="grid gap-4 md:grid-cols-2 lg:@[829px]/main:w-85 lg:@[829px]/main:shrink-0 lg:@[829px]/main:grid-cols-1 lg:@[829px]/main:grid-rows-[minmax(0,max-content)_1fr] lg:@[829px]/main:gap-6">
        <TotalBillsCard amount={totalBillsAmount} />
        <BillsSummaryCard summary={recurringBillsSummary} />
      </div>
      <div className="min-w-0 flex-1">
        <BillsContent bills={recurringBills} />
      </div>
    </div>
  )
}
