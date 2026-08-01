import { PageHeading } from "@/components/overview/page-heading"
import { AddBudgetDialog } from "@/components/budgets/add-budget-dialog"
import { BudgetsPageContent } from "@/components/budgets/budgets-page-content"

export default function BudgetsPage() {
  return (
    <div className="flex min-h-0 flex-col gap-8 @[829px]/main:h-[calc(100dvh-var(--page-chrome-block))] @[829px]/main:overflow-hidden">
      <PageHeading title="Budgets" fixed className="shrink-0">
        <AddBudgetDialog />
      </PageHeading>
      <BudgetsPageContent />
    </div>
  )
}
