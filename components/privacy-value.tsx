"use client"

import type { ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { useFinance } from "@/hooks/use-finance"
import { getHiddenValueAriaLabel } from "@/lib/finance/ui-preferences"
import { cn } from "@/lib/utils"

interface PrivacyValueProps {
  children: ReactNode
  /**
   * Content used only to size the privacy mask. Defaults to `children`.
   * Pass a lighter placeholder when the visible children are interactive or
   * otherwise heavier than the resting layout (e.g. compact money text).
   */
  placeholder?: ReactNode
  className?: string
  /** Accessible name while privacy mode is on. */
  hiddenLabel?: string
}

/**
 * Masks arbitrary sensitive UI when privacy mode is on.
 * Use manually for non-money values after inspection — not a required rule.
 */
export function PrivacyValue({
  children,
  placeholder,
  className,
  hiddenLabel = getHiddenValueAriaLabel(),
}: PrivacyValueProps) {
  const {
    state: {
      preferences: { hideAmounts },
    },
  } = useFinance()

  if (!hideAmounts) {
    return <span className={className}>{children}</span>
  }

  return (
    <span
      className={cn("relative inline-grid max-w-full", className)}
      aria-label={hiddenLabel}
    >
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {placeholder ?? children}
      </span>
      <Skeleton
        as="span"
        animate={false}
        aria-hidden
        className="col-start-1 row-start-1 h-full min-h-[1em] w-full self-center"
      />
    </span>
  )
}
