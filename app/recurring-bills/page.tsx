import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/overview/page-heading"
import { RecurringBillsPageContent } from "@/components/recurring-bills/recurring-bills-page-content"

export default function RecurringBillsPage() {
  return (
    <AppShell activeKey="recurring-bills">
      {/* Sticky Header */}
      <div className="bg-background sticky top-0 z-10 -mx-4 -mt-6 px-4 py-4 md:-mx-10 md:-mt-8 md:px-10 md:py-6">
        <PageHeading title="Recurring Bills" />
      </div>

      {/* Main Content */}
      <RecurringBillsPageContent />
    </AppShell>
  )
}
