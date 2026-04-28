"use client"

import { useFinance } from "@/hooks/use-finance"
import { BillsContent } from "./bills-content"
import { BillsSummaryCard } from "./bills-summary-card"
import { TotalBillsCard } from "./total-bills-card"

export function RecurringBillsPageContent() {
  const { recurringBills, totalBillsAmount } = useFinance()

  return (
    <div className="mt-6 flex flex-col gap-6 lg:flex-row">
      {/* Left Column: Total Bills & Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:w-[340px] lg:shrink-0 lg:grid-cols-1 lg:gap-6">
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
