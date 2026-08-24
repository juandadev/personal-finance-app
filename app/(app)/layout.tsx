import type { ReactNode } from "react"

import { FinanceAppShell } from "@/components/providers/finance-app-shell"
import { requireAuth } from "@/lib/auth/session"
import { loadFinanceShellState } from "@/lib/finance/queries"

export const dynamic = "force-dynamic"

function getSessionDisplayName(user: {
  name?: string | null
  email?: string | null
}) {
  return user.name ?? user.email ?? null
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth({ redirectTo: "/login" })

  const initialState = await loadFinanceShellState(
    session.user.id,
    getSessionDisplayName(session.user),
  )

  return (
    <FinanceAppShell initialState={initialState}>{children}</FinanceAppShell>
  )
}
