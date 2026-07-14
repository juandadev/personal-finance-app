import { CreditCardsPageContent } from "@/components/credit-cards/credit-cards-page-content"
import { AddCreditCardDialog } from "@/components/credit-cards/credit-card-dialog"
import { PageHeading } from "@/components/overview/page-heading"

export default function CreditCardsPage() {
  return (
    <div className="mx-auto flex w-full flex-col">
      <PageHeading title="Credit Cards">
        <AddCreditCardDialog />
      </PageHeading>
      <CreditCardsPageContent />
    </div>
  )
}
