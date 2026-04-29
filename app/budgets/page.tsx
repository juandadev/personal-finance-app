import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/overview/page-heading"
import { AddBudgetDialog } from "@/components/budgets/add-budget-dialog"
import { BudgetsPageContent } from "@/components/budgets/budgets-page-content"

export default function BudgetsPage() {
  return (
    <AppShell activeKey="budgets">
      {/* Sticky Header */}
      <div className="bg-background sticky top-0 z-10 -mx-4 -mt-6 flex items-center justify-between px-4 py-4 md:-mx-10 md:-mt-8 md:px-10 md:py-6">
        <PageHeading title="Budgets" />
        <AddBudgetDialog />
      </div>

      {/* Main Content */}
      <BudgetsPageContent />
    </AppShell>
  )
}
