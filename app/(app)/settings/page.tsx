import type { Metadata } from "next"

import { getCurrentAccountRequiresPassword } from "@/app/(app)/settings/actions"
import { PageHeading } from "@/components/overview/page-heading"
import { AccountDataSettings } from "@/components/settings/account-data-settings"

export const metadata: Metadata = {
  title: "Settings | Finance",
  description: "Manage your finance data and account.",
}

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const requiresPassword = await getCurrentAccountRequiresPassword()

  return (
    <>
      <PageHeading title="Settings" fixed />
      <AccountDataSettings requiresPassword={requiresPassword} />
    </>
  )
}
