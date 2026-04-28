import Link from "next/link"
import { cn } from "@/lib/utils"
import type { NavItem as NavItemType } from "@/lib/types"

interface BottomNavItemProps {
  item: NavItemType
  active?: boolean
}

export function BottomNavItem({ item, active = false }: BottomNavItemProps) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground hover:text-sidebar-primary-foreground"
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">{item.label}</span>
    </Link>
  )
}
