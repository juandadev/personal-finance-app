import { CreditCardsPageContent } from "@/components/credit-cards/credit-cards-page-content"
import { AddCreditCardDialog } from "@/components/credit-cards/credit-card-dialog"
import { PageHeading } from "@/components/overview/page-heading"

export const metadata = {
  title: "Credit Cards | Finance",
  description: "Manage your credit cards",
}

export default function CreditCardsPage() {
  return (
    <div className="flex h-[calc(100dvh-var(--page-chrome-block))] min-h-0 flex-col gap-8 overflow-hidden">
      <PageHeading title="Credit Cards" fixed className="shrink-0">
        <AddCreditCardDialog />
      </PageHeading>
      <CreditCardsPageContent />
    </div>
  )
}
