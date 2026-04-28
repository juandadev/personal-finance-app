import Link from "next/link"
import { cn } from "@/lib/utils"
import type { NavItem as NavItemType } from "@/lib/types"

interface NavItemProps {
  item: NavItemType
  active?: boolean
  collapsed?: boolean
}

export function NavItem({ item, active = false, collapsed = false }: NavItemProps) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-4 rounded-r-xl px-6 py-4 text-sm font-bold transition-colors",
        "text-sidebar-foreground hover:text-sidebar-primary-foreground",
        active && "bg-sidebar-accent text-sidebar-accent-foreground hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 rounded-r bg-sidebar-primary" />
      )}
      <Icon
        className={cn(
          "size-5 shrink-0",
          active ? "text-sidebar-primary" : "text-sidebar-foreground group-hover:text-sidebar-primary-foreground",
        )}
        aria-hidden
      />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}
