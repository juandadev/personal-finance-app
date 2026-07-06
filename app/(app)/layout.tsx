import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { FinanceAppShell } from "@/components/providers/finance-app-shell"
import { isAdminUser } from "@/lib/admin/access"
import { auth } from "@/lib/auth/server"
import { loadFinanceState } from "@/lib/finance/queries"

export const dynamic = "force-dynamic"

function getSessionDisplayName(user: {
  name?: string | null
  email?: string | null
}) {
  return user.name ?? user.email ?? null
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { data: session } = await auth.getSession()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const initialState = await loadFinanceState(
    session.user.id,
    getSessionDisplayName(session.user),
  )

  return (
    <FinanceAppShell
      initialState={initialState}
      isAdmin={isAdminUser(session.user)}
    >
      {children}
    </FinanceAppShell>
  )
}
