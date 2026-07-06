import type { NavItem } from "@/lib/types"
import { BottomNavItem } from "./bottom-nav-item"

interface BottomNavProps {
  activeKey: string
  navItems: NavItem[]
}

export function BottomNav({ activeKey, navItems }: BottomNavProps) {
  return (
    <nav
      className="bg-sidebar fixed inset-x-0 bottom-0 z-50 flex px-4 pt-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Main navigation"
    >
      <ul className="flex flex-1 items-center justify-around">
        {navItems.map((item) => (
          <li key={item.key} className="relative isolate">
            <BottomNavItem item={item} active={activeKey === item.href} />
          </li>
        ))}
      </ul>
    </nav>
  )
}
