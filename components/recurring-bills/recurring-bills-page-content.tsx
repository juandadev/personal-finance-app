"use client"

import { useFinance } from "@/hooks/use-finance"
import { BillsContent } from "./bills-content"
import { BillsSummaryCard } from "./bills-summary-card"
import { TotalBillsCard } from "./total-bills-card"

export function RecurringBillsPageContent() {
  const { recurringBills, recurringBillsSummary, totalBillsAmount } =
    useFinance()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:@[829px]/main:flex-row">
      <div className="grid shrink-0 content-start gap-4 md:grid-cols-2 lg:@[829px]/main:w-85 lg:@[829px]/main:grid-cols-1 lg:@[829px]/main:gap-6 lg:@[829px]/main:self-start">
        <TotalBillsCard amount={totalBillsAmount} />
        <BillsSummaryCard summary={recurringBillsSummary} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <BillsContent bills={recurringBills} />
      </div>
    </div>
  )
}
