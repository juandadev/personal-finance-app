import { SummaryCards } from "@/components/overview/summary-cards"
import { PageHeading } from "@/components/overview/page-heading"
import { PotsCard } from "@/components/overview/pots/pots-card"
import { BudgetsCard } from "@/components/overview/budgets/budgets-card"
import { CreditCardsCard } from "@/components/overview/credit-cards/credit-cards-card"
import { TransactionsCard } from "@/components/overview/transactions/transactions-card"
import { RecurringBillsCard } from "@/components/overview/recurring-bills/recurring-bills-card"

export default function OverviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <PageHeading title="Overview" />
      <SummaryCards />
      <div className="grid gap-6 lg:@[829px]/main:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <PotsCard />
          <TransactionsCard />
        </div>
        <div className="flex flex-col gap-4">
          <BudgetsCard />
          <CreditCardsCard />
          <RecurringBillsCard />
        </div>
      </div>
    </div>
  )
}
