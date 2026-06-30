import Link from "next/link"
import type { NavItem as NavItemType } from "@/lib/types"
import {
  SidebarLabel,
  SidebarMenuActiveIndicator,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavItemProps {
  item: NavItemType
  active?: boolean
}

export function NavItem({ item, active = false }: NavItemProps) {
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      {active && <SidebarMenuActiveIndicator />}
      <SidebarMenuButton
        asChild
        isActive={active}
        size="lg"
        tooltip={item.label}
      >
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          aria-label={item.label}
        >
          <Icon aria-hidden />
          <SidebarLabel>{item.label}</SidebarLabel>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
