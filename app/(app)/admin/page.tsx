import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { MonthlyBudgetResetCard } from "@/components/admin/monthly-budget-reset-card"
import { PageHeading } from "@/components/overview/page-heading"
import { isAdminUser } from "@/lib/admin/access"
import { auth } from "@/lib/auth/server"

export const metadata: Metadata = {
  title: "Admin | Finance",
  description: "Local development tools for monthly budget close.",
}

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const { data: session } = await auth.getSession()

  if (!isAdminUser(session?.user)) {
    notFound()
  }

  return (
    <>
      <PageHeading title="Admin" fixed />
      <div>
        <MonthlyBudgetResetCard />
      </div>
    </>
  )
}
