import { CreditCardDetailContent } from "@/components/credit-cards/credit-card-detail-content"
import { PageHeading } from "@/components/overview/page-heading"

export default async function CreditCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--page-chrome-block))] min-h-0 w-full max-w-6xl flex-col gap-8 overflow-hidden">
      <PageHeading title="Credit Card Details" fixed className="shrink-0" />
      <CreditCardDetailContent creditCardId={id} />
    </div>
  )
}
