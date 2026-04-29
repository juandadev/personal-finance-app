import type { ReactNode } from "react"
import { AppSidebar } from "./sidebar/app-sidebar"
import { BottomNav } from "./bottom-nav/bottom-nav"
import type { NavKey } from "@/lib/types"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

interface AppShellProps {
  activeKey: NavKey
  children: ReactNode
}

export function AppShell({ activeKey, children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen className="bg-background">
      <AppSidebar activeKey={activeKey} />
      <SidebarInset className="px-4 py-6 pb-24 md:px-10 md:py-8 lg:pb-10">
        {children}
      </SidebarInset>
      <BottomNav activeKey={activeKey} />
    </SidebarProvider>
  )
}
