import { SummaryCards } from "@/components/overview/summary-cards"
import { PageHeading } from "@/components/overview/page-heading"
import { PotsCard } from "@/components/overview/pots/pots-card"
import { BudgetsCard } from "@/components/overview/budgets/budgets-card"
import { CreditCardsCard } from "@/components/overview/credit-cards/credit-cards-card"
import { DueForPaymentCard } from "@/components/overview/due-for-payment/due-for-payment-card"
import { TransactionsCard } from "@/components/overview/transactions/transactions-card"
import { RecurringBillsCard } from "@/components/overview/recurring-bills/recurring-bills-card"
import { requireUserId } from "@/lib/auth/session"
import { loadLatestTransactions } from "@/lib/finance/queries"

export default async function OverviewPage() {
  const userId = await requireUserId({ redirectTo: "/login" })
  const latestTransactions = await loadLatestTransactions(userId, 4)

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-col gap-8 @[829px]/main:h-[calc(100dvh-var(--page-chrome-block))] @[829px]/main:overflow-hidden">
      <PageHeading title="Overview" className="shrink-0" />
      <div className="shrink-0">
        <SummaryCards />
      </div>
      <div className="grid min-h-0 flex-1 gap-6 lg:@[829px]/main:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6 overflow-y-auto rounded-xl lg:@[829px]/main:pr-2">
          <PotsCard />
          <TransactionsCard transactions={latestTransactions} />
          <DueForPaymentCard />
        </div>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-xl lg:@[829px]/main:pr-2">
          <BudgetsCard />
          <CreditCardsCard />
          <RecurringBillsCard />
        </div>
      </div>
    </div>
  )
}
