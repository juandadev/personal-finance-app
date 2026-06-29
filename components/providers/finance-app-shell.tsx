"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

import { BottomNav } from "@/components/bottom-nav/bottom-nav"
import { FinanceProvider } from "@/components/providers/finance-provider"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import type { FinanceState } from "@/lib/finance/types"

interface FinanceAppShellProps {
  children: ReactNode
  initialState: FinanceState
}

export function FinanceAppShell({
  children,
  initialState,
}: FinanceAppShellProps) {
  const pathname = usePathname()

  return (
    <FinanceProvider initialState={initialState}>
      <AppSidebar activeKey={pathname} />
      <BottomNav activeKey={pathname} />
      <SidebarInset className="@container/main px-4 py-6 pb-24 md:px-10 md:py-8 md:pb-25 lg:pb-10">
        <div className="flex flex-col gap-8">{children}</div>
      </SidebarInset>
    </FinanceProvider>
  )
}
