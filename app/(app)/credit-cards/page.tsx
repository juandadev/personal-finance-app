import { CreditCardsPageContent } from "@/components/credit-cards/credit-cards-page-content"
import { PageHeading } from "@/components/overview/page-heading"

export default function CreditCardsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col">
      <PageHeading title="Credit Cards" />
      <CreditCardsPageContent />
    </div>
  )
}
