import { CreditCardDetailContent } from "@/components/credit-cards/credit-card-detail-content"
import { PageHeading } from "@/components/overview/page-heading"

export default async function CreditCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col">
      <PageHeading title="Credit Card Details" />
      <CreditCardDetailContent creditCardId={id} />
    </div>
  )
}
