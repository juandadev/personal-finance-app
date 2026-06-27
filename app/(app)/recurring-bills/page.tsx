import { PageHeading } from "@/components/overview/page-heading"
import { RecurringBillsPageContent } from "@/components/recurring-bills/recurring-bills-page-content"

export default function RecurringBillsPage() {
  return (
    <>
      <PageHeading title="Recurring Bills" fixed />
      <RecurringBillsPageContent />
    </>
  )
}
