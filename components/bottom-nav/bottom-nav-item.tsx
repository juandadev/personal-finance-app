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
        "flex flex-col items-center gap-1 rounded-lg px-4 py-3 text-xs font-bold transition-colors md:px-3 md:py-2",
        active
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground hover:text-sidebar-primary-foreground"
      )}
    >
      <Icon className="size-6 shrink-0" aria-hidden />
      <span className="sr-only md:not-sr-only md:whitespace-nowrap">{item.label}</span>
    </Link>
  )
}
