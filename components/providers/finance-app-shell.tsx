"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

import { BottomNav } from "@/components/bottom-nav/bottom-nav"
import { GlobalMenu } from "@/components/global-menu/global-menu"
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
      <SidebarInset className="@container/main px-4 py-6 pb-24 [--page-chrome-block:calc(var(--spacing)*6+var(--spacing)*24)] md:px-10 md:py-8 md:pb-25 md:[--page-chrome-block:calc(var(--spacing)*8+var(--spacing)*25)] lg:pb-10 lg:[--page-chrome-block:calc(var(--spacing)*8+var(--spacing)*10)]">
        <GlobalMenu />
        <div className="flex min-h-0 flex-col gap-8">{children}</div>
      </SidebarInset>
    </FinanceProvider>
  )
}
