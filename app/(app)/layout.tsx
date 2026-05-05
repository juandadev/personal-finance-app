"use client"

import type { ReactNode } from "react"
import { FinanceProvider } from "@/components/providers/finance-provider"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { BottomNav } from "@/components/bottom-nav/bottom-nav"
import { usePathname } from "next/navigation"

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <FinanceProvider>
      <AppSidebar activeKey={pathname} />
      <BottomNav activeKey={pathname} />
      <SidebarInset className="@container/main px-4 py-6 pb-24 md:px-10 md:py-8 lg:pb-10">
        <main className="flex flex-col gap-8">{children}</main>
      </SidebarInset>
    </FinanceProvider>
  )
}
