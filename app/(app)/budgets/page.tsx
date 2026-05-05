import { PageHeading } from "@/components/overview/page-heading"
import { AddBudgetDialog } from "@/components/budgets/add-budget-dialog"
import { BudgetsPageContent } from "@/components/budgets/budgets-page-content"

export default function BudgetsPage() {
  return (
    <>
      <PageHeading title="Budgets" className="fixed w-full sm:relative">
        <AddBudgetDialog />
      </PageHeading>
      <BudgetsPageContent />
    </>
  )
}
