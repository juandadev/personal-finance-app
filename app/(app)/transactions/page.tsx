import { TransactionsContent } from "@/components/transactions/transactions-content"
import { PageHeading } from "@/components/overview/page-heading"

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeading title="Transactions" />
      <TransactionsContent />
    </div>
  )
}
