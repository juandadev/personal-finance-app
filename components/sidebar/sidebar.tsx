"use client"

import { useState } from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { navItems } from "@/lib/data"
import type { NavKey } from "@/lib/types"
import { Logo } from "./logo"
import { NavItem } from "./nav-item"

interface SidebarProps {
  activeKey: NavKey
}

export function Sidebar({ activeKey }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-300 lg:flex",
        collapsed ? "w-20" : "w-72",
      )}
      aria-label="Primary"
    >
      <div className={cn("px-8 py-10", collapsed && "px-0 flex justify-center")}>
        <Logo collapsed={collapsed} />
      </div>

      <nav className={cn("flex-1", collapsed ? "pr-0" : "pr-6")} aria-label="Main navigation">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.key}>
              <NavItem item={item} active={activeKey === item.key} collapsed={collapsed} />
            </li>
          ))}
        </ul>
      </nav>

      <div className={cn("px-6 pb-10", collapsed && "px-0 flex justify-center")}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "flex items-center gap-4 rounded-r-xl px-2 py-3 text-sm font-bold text-sidebar-foreground transition-colors hover:text-sidebar-primary-foreground",
            collapsed && "justify-center px-0",
          )}
          aria-label={collapsed ? "Expand menu" : "Minimize menu"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" aria-hidden />
          ) : (
            <PanelLeftClose className="size-5" aria-hidden />
          )}
          {!collapsed && <span>Minimize Menu</span>}
        </button>
      </div>
    </aside>
  )
}
