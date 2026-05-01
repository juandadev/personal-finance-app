import { SummaryCards } from "@/components/overview/summary-cards"
import { PageHeading } from "@/components/overview/page-heading"
import { PotsCard } from "@/components/overview/pots/pots-card"
import { BudgetsCard } from "@/components/overview/budgets/budgets-card"
import { TransactionsCard } from "@/components/overview/transactions/transactions-card"
import { RecurringBillsCard } from "@/components/overview/recurring-bills/recurring-bills-card"

export default function OverviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <PageHeading title="Overview" />

      <SummaryCards />

      <div className="overview-main-grid grid gap-6">
        <div className="flex flex-col gap-6">
          <PotsCard />
          <TransactionsCard />
        </div>

        <div className="flex flex-col gap-6">
          <BudgetsCard />
          <RecurringBillsCard />
        </div>
      </div>
    </div>
  )
}
