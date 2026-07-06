"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

import { BottomNav } from "@/components/bottom-nav/bottom-nav"
import { FinanceProvider } from "@/components/providers/finance-provider"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { getNavItems } from "@/lib/data"
import type { FinanceState } from "@/lib/finance/types"

interface FinanceAppShellProps {
  children: ReactNode
  initialState: FinanceState
  isAdmin?: boolean
}

export function FinanceAppShell({
  children,
  initialState,
  isAdmin = false,
}: FinanceAppShellProps) {
  const pathname = usePathname()
  const navItems = getNavItems({ isAdmin })

  return (
    <FinanceProvider initialState={initialState}>
      <AppSidebar activeKey={pathname} navItems={navItems} />
      <BottomNav activeKey={pathname} navItems={navItems} />
      <SidebarInset className="@container/main px-4 py-6 pb-24 md:px-10 md:py-8 md:pb-25 lg:pb-10">
        <div className="flex flex-col gap-8">{children}</div>
      </SidebarInset>
    </FinanceProvider>
  )
}
