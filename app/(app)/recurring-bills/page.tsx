import { PageHeading } from "@/components/overview/page-heading"
import { AddBillDialog } from "@/components/recurring-bills/bill-dialog"
import { RecurringBillsPageContent } from "@/components/recurring-bills/recurring-bills-page-content"

export default function RecurringBillsPage() {
  return (
    <>
      <PageHeading title="Recurring Bills" fixed>
        <AddBillDialog />
      </PageHeading>
      <RecurringBillsPageContent />
    </>
  )
}
