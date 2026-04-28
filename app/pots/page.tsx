import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/overview/page-heading"
import { PotsPageContent } from "@/components/pots/pots-page-content"

export const metadata = {
  title: "Pots | Finance",
  description: "Manage your savings pots",
}

export default function PotsPage() {
  return (
    <AppShell activeKey="pots">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 -mx-4 -mt-6 flex items-center justify-between bg-background px-4 py-4 md:-mx-10 md:-mt-8 md:px-10 md:py-6">
        <PageHeading title="Pots" />
        <button
          type="button"
          className="rounded-lg bg-sidebar px-4 py-3 text-sm font-bold text-sidebar-primary-foreground transition-colors hover:bg-sidebar/90"
        >
          + Add New Pot
        </button>
      </div>

      {/* Pots Grid */}
      <PotsPageContent />
    </AppShell>
  )
}
