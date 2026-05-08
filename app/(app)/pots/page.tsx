import { PageHeading } from "@/components/overview/page-heading"
import { AddPotDialog } from "@/components/pots/add-pot-dialog"
import { PotsPageContent } from "@/components/pots/pots-page-content"

export const metadata = {
  title: "Pots | Finance",
  description: "Manage your savings pots",
}

export default function PotsPage() {
  return (
    <>
      <PageHeading title="Pots" fixed>
        <AddPotDialog />
      </PageHeading>
      <PotsPageContent />
    </>
  )
}
