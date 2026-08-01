import { TransactionsPageHeader } from "@/components/transactions/transactions-page-header"
import { TransactionsContent } from "@/components/transactions/transactions-content"

export default function TransactionsPage() {
  return (
    <div className="flex min-h-0 flex-col gap-8 @[829px]/main:h-[calc(100dvh-var(--page-chrome-block))] @[829px]/main:overflow-hidden">
      <TransactionsPageHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TransactionsContent />
      </div>
    </div>
  )
}
