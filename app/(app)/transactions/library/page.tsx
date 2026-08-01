import Link from "next/link"
import { PageHeading } from "@/components/overview/page-heading"
import { TransactionLibraryContent } from "@/components/transactions/transaction-library-content"
import { Button } from "@/components/ui/button"

export default function TransactionLibraryPage() {
  return (
    <>
      <PageHeading title="Transaction Library" className="gap-3">
        <Button variant="secondary" asChild>
          <Link href="/transactions">Back to Transactions</Link>
        </Button>
      </PageHeading>
      <TransactionLibraryContent />
    </>
  )
}
