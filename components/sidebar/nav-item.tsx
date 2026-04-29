import Link from "next/link"
import type { NavItem as NavItemType } from "@/lib/types"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

interface NavItemProps {
  item: NavItemType
  active?: boolean
}

export function NavItem({ item, active = false }: NavItemProps) {
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        size="lg"
        tooltip={item.label}
      >
        <Link href={item.href} aria-current={active ? "page" : undefined}>
          <Icon aria-hidden />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
