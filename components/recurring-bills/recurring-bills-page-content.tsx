"use client"

import { useFinance } from "@/hooks/use-finance"
import { BillsContent } from "./bills-content"
import { BillsSummaryCard } from "./bills-summary-card"
import { TotalBillsCard } from "./total-bills-card"

export function RecurringBillsPageContent() {
  const { recurringBills, totalBillsAmount } = useFinance()

  return (
    <div className="recurring-bills-main-layout mt-6 flex flex-col gap-6">
      {/* Left Column: Total Bills & Summary */}
      <div className="recurring-bills-sidebar-layout grid gap-4 md:grid-cols-2">
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
