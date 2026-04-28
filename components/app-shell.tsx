import type { ReactNode } from "react"
import { Sidebar } from "./sidebar/sidebar"
import { BottomNav } from "./bottom-nav/bottom-nav"
import type { NavKey } from "@/lib/types"

interface AppShellProps {
  activeKey: NavKey
  children: ReactNode
}

export function AppShell({ activeKey, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeKey={activeKey} />
      <main className="flex-1 px-4 py-6 pb-24 md:px-10 md:py-8 lg:pb-10">{children}</main>
      <BottomNav activeKey={activeKey} />
    </div>
  )
}
