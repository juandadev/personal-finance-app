import type { NavItem } from "@/lib/types"
import { BottomNavItem } from "./bottom-nav-item"

interface BottomNavProps {
  activeKey: string
  navItems: NavItem[]
}

function isActiveNavItem(activeKey: string, href: string) {
  return href === "/" ? activeKey === href : activeKey.startsWith(href)
}

export function BottomNav({ activeKey, navItems }: BottomNavProps) {
  return (
    <nav
      className="bg-sidebar fixed inset-x-0 bottom-0 z-50 scrollbar-none overflow-x-auto overscroll-x-contain pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden [&::-webkit-scrollbar]:hidden"
      aria-label="Main navigation"
    >
      <ul className="mx-auto flex w-max min-w-full items-stretch justify-center gap-2 overflow-x-auto px-2">
        {navItems.map((item) => (
          <li key={item.key} className="relative isolate shrink-0">
            <BottomNavItem
              item={item}
              active={isActiveNavItem(activeKey, item.href)}
            />
          </li>
        ))}
      </ul>
    </nav>
  )
}
