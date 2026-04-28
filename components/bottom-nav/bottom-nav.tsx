import { navItems } from "@/lib/data"
import type { NavKey } from "@/lib/types"
import { BottomNavItem } from "./bottom-nav-item"

interface BottomNavProps {
  activeKey: NavKey
}

export function BottomNav({ activeKey }: BottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex bg-sidebar px-4 pb-2 pt-2 lg:hidden"
      aria-label="Main navigation"
    >
      <ul className="flex flex-1 items-center justify-around">
        {navItems.map((item) => (
          <li key={item.key}>
            <BottomNavItem item={item} active={activeKey === item.key} />
          </li>
        ))}
      </ul>
    </nav>
  )
}
