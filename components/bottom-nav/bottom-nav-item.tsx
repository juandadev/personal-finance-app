import Link from "next/link"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import type { NavItem as NavItemType } from "@/lib/types"
import { motion, useReducedMotion } from "motion/react"

interface BottomNavItemProps {
  item: NavItemType
  active?: boolean
}

export function BottomNavItem({ item, active = false }: BottomNavItemProps) {
  const shouldReduceMotion = useReducedMotion()
  const linkRef = useRef<HTMLAnchorElement>(null)
  const Icon = item.icon

  useEffect(() => {
    if (active) {
      linkRef.current?.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "center",
      })
    }
  }, [active])

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
        ref={linkRef}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 min-w-11 shrink-0 flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs font-bold transition-colors md:px-3 md:py-2",
          active
            ? "text-sidebar-primary"
            : "text-sidebar-foreground hover:text-sidebar-primary-foreground",
        )}
      >
        <Icon className="size-6 shrink-0" weight="fill" aria-hidden />
        <span className="sr-only md:not-sr-only md:whitespace-nowrap">
          {item.label}
        </span>
      </Link>
    </>
  )
}
