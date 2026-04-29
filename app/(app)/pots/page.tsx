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
      {/* Sticky Header */}
      <div className="bg-background sticky top-0 z-10 -mx-4 -mt-6 flex items-center justify-between px-4 py-4 md:-mx-10 md:-mt-8 md:px-10 md:py-6">
        <PageHeading title="Pots" />
        <AddPotDialog />
      </div>

      {/* Pots Grid */}
      <PotsPageContent />
    </>
  )
}
