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
      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Left Column: Total Bills & Summary */}
        <div className="flex flex-col gap-6 md:flex-row md:gap-4 lg:flex-col lg:gap-6">
          <div className="md:flex-1 lg:flex-none">
            <TotalBillsCard amount={totalBillsAmount} />
          </div>
          <div className="md:flex-1 lg:flex-none">
            <BillsSummaryCard bills={recurringBills} />
          </div>
        </div>

        {/* Right Column: Bills Table */}
        <BillsContent bills={recurringBills} />
      </div>
    </AppShell>
  )
}
