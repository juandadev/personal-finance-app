import { TransactionsContent } from "@/components/transactions/transactions-content"
import { PageHeading } from "@/components/overview/page-heading"

export default function TransactionsPage() {
  return (
    <>
      <PageHeading title="Transactions" />
      <TransactionsContent />
    </>
  )
}
