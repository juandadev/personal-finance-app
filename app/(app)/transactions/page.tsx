import Link from "next/link"
import { ModuleHeaderActions } from "@/components/actions"
import { TransactionsContent } from "@/components/transactions/transactions-content"
import { PageHeading } from "@/components/overview/page-heading"
import { AddTransactionDialog } from "@/components/transactions/transaction-dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export default function TransactionsPage() {
  return (
    <>
      <PageHeading title="Transactions">
        <ModuleHeaderActions
          primaryAction={<AddTransactionDialog />}
          ariaLabel="More transaction actions"
        >
          <DropdownMenuItem asChild>
            <Link href="/transactions/library">Manage Library</Link>
          </DropdownMenuItem>
        </ModuleHeaderActions>
      </PageHeading>
      <TransactionsContent />
    </>
  )
}
