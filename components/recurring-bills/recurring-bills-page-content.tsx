"use client"

import { useFinance } from "@/hooks/use-finance"
import { BillsContent } from "./bills-content"
import { BillsSummaryCard } from "./bills-summary-card"
import { TotalBillsCard } from "./total-bills-card"

export function RecurringBillsPageContent() {
  const { recurringBills, totalBillsAmount } = useFinance()

  return (
    <div className="mt-6 flex flex-col gap-6 lg:@[829px]/main:flex-row">
      {/* Left Column: Total Bills & Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:@[829px]/main:w-[340px] lg:@[829px]/main:shrink-0 lg:@[829px]/main:grid-cols-1 lg:@[829px]/main:gap-6">
        <TotalBillsCard amount={totalBillsAmount} />
        <BillsSummaryCard bills={recurringBills} />
      </div>

      {/* Right Column: Bills Table */}
      <div className="flex-1">
        <BillsContent bills={recurringBills} />
      </div>
    </div>
  )
}
