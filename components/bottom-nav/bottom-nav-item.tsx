import Link from "next/link"
import { cn } from "@/lib/utils"
import type { NavItem as NavItemType } from "@/lib/types"
import { motion, useReducedMotion } from "motion/react"

interface BottomNavItemProps {
  item: NavItemType
  active?: boolean
}

export function BottomNavItem({ item, active = false }: BottomNavItemProps) {
  const shouldReduceMotion = useReducedMotion()
  const Icon = item.icon

  return (
    <>
      {active && (
        <motion.div
          layoutId="bottom-navbar-pill"
          className="bg-sidebar-accent border-accent absolute inset-0 -z-1 rounded-t-lg border-b-4"
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: [0.79, 0.14, 0.15, 0.86] }
          }
        />
      )}
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center gap-1 rounded-lg px-4 py-3 text-xs font-bold transition-colors md:px-3 md:py-2",
          active
            ? "text-sidebar-primary"
            : "text-sidebar-foreground hover:text-sidebar-primary-foreground",
        )}
      >
        <Icon className="size-6 shrink-0" aria-hidden />
        <span className="sr-only md:not-sr-only md:whitespace-nowrap">
          {item.label}
        </span>
      </Link>
    </>
  )
}
