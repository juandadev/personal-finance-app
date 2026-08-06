import { TransactionsPageHeader } from "@/components/transactions/transactions-page-header"
import { TransactionsContent } from "@/components/transactions/transactions-content"
import { requireUserId } from "@/lib/auth/session"
import { loadTransactionPage } from "@/lib/finance/queries"
import { normalizeTransactionFilters } from "@/lib/finance/url-filters"
import { transactionSearchParamsCache } from "@/lib/finance/url-filters/transaction-search-params"

type TransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const [userId, query] = await Promise.all([
    requireUserId({ redirectTo: "/login" }),
    transactionSearchParamsCache.parse(searchParams),
  ])

  const page = await loadTransactionPage(
    userId,
    normalizeTransactionFilters(query),
  )

  return (
    <div className="flex min-h-0 flex-col gap-8 @[829px]/main:h-[calc(100dvh-var(--page-chrome-block))] @[829px]/main:overflow-hidden">
      <TransactionsPageHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TransactionsContent {...page} />
      </div>
    </div>
  )
}
