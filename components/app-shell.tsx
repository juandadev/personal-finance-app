import type { ReactNode } from "react"
import { Sidebar } from "./sidebar/sidebar"
import type { NavKey } from "@/lib/types"

interface AppShellProps {
  activeKey: NavKey
  children: ReactNode
}

export function AppShell({ activeKey, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeKey={activeKey} />
      <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  )
}
