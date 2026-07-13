"use client"

import { CreditCardIcon } from "@phosphor-icons/react"

import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

interface CreditCardBadgeProps {
  nickname: string
  initials: string
  color: ThemeColor
  className?: string
}

export function CreditCardBadge({
  nickname,
  initials,
  color,
  className,
}: CreditCardBadgeProps) {
  return (
    <div
      aria-label={nickname}
      className={cn(
        "flex size-12 items-center justify-center rounded-xl border-2 text-xs font-bold text-white",
        themeColorClasses[color].bg,
        themeColorClasses[color].border,
        className,
      )}
    >
      <span className="sr-only">{nickname}</span>
      <span aria-hidden className="flex items-center gap-1">
        <CreditCardIcon weight="fill" className="size-3.5 text-white" />
        {initials}
      </span>
    </div>
  )
}
