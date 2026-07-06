import Link from "next/link"
import { TransactionsContent } from "@/components/transactions/transactions-content"
import { PageHeading } from "@/components/overview/page-heading"
import { AddTransactionDialog } from "@/components/transactions/transaction-dialog"
import { Button } from "@/components/ui/button"

export default function TransactionsPage() {
  return (
    <>
      <PageHeading title="Transactions" className="gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" asChild>
            <Link href="/transactions/library">Manage Library</Link>
          </Button>
          <AddTransactionDialog />
        </div>
      </PageHeading>
      <TransactionsContent />
    </>
  )
}
