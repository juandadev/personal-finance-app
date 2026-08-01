import { PageHeading } from "@/components/overview/page-heading"
import { AddBillDialog } from "@/components/recurring-bills/bill-dialog"
import { RecurringBillsPageContent } from "@/components/recurring-bills/recurring-bills-page-content"

export default function RecurringBillsPage() {
  return (
    <div className="flex min-h-0 flex-col gap-8 @[829px]/main:h-[calc(100dvh-var(--page-chrome-block))] @[829px]/main:overflow-hidden">
      <PageHeading title="Recurring Bills" fixed className="shrink-0">
        <AddBillDialog />
      </PageHeading>
      <RecurringBillsPageContent />
    </div>
  )
}
