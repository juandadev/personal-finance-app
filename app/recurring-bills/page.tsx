import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/overview/page-heading"
import { TotalBillsCard } from "@/components/recurring-bills/total-bills-card"
import { BillsSummaryCard } from "@/components/recurring-bills/bills-summary-card"
import { BillsContent } from "@/components/recurring-bills/bills-content"
import { recurringBills, totalBillsAmount } from "@/lib/data"

export default function RecurringBillsPage() {
  return (
    <AppShell activeKey="recurring-bills">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 -mx-4 -mt-6 bg-background px-4 py-4 md:-mx-10 md:-mt-8 md:px-10 md:py-6">
        <PageHeading title="Recurring Bills" />
      </div>

      {/* Main Content */}
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
    </AppShell>
  )
}
