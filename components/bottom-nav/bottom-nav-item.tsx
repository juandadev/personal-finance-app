import Link from "next/link"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import type { NavItem as NavItemType } from "@/lib/types"

interface BottomNavItemProps {
  item: NavItemType
  active?: boolean
}

export function BottomNavItem({ item, active = false }: BottomNavItemProps) {
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
        <div className="bg-sidebar-accent border-accent absolute inset-0 -z-1 rounded-t-lg border-b-4" />
      )}
      <Link
        ref={linkRef}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 min-w-11 shrink-0 flex-col items-center gap-1 rounded-lg px-5 py-3 text-xs font-bold transition-colors md:px-3 md:py-2",
          active
            ? "text-sidebar-primary"
            : "text-sidebar-foreground hover:text-sidebar-primary-foreground",
        )}
      >
        <Icon className="size-6 shrink-0" weight="fill" aria-hidden />
        <span className="sr-only md:whitespace-nowrap lg:not-sr-only">
          {item.label}
        </span>
      </Link>
    </>
  )
}
