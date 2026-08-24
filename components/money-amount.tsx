"use client"

import { useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { PrivacyValue } from "@/components/privacy-value"
import { useFinance } from "@/hooks/use-finance"
import {
  formatCompactCurrency,
  formatCurrency,
  formatSignedAmount,
} from "@/lib/format"
import type { CurrencyCode } from "@/lib/finance/types"
import { getHiddenAmountAriaLabel } from "@/lib/finance/ui-preferences"
import { cn } from "@/lib/utils"

const COMPACT_THRESHOLD = 100_000

interface MoneyAmountProps {
  amount: number
  variant?: "currency" | "signed"
  currency?: CurrencyCode
  forceDecimals?: boolean
  className?: string
  expandedClassName?: string
}

function formatFullAmount(
  amount: number,
  variant: "currency" | "signed",
  currency: CurrencyCode,
  forceDecimals?: boolean,
): string {
  if (variant === "signed") {
    return formatSignedAmount(amount, { currency })
  }

  return formatCurrency(amount, { currency, forceDecimals })
}

function formatCompactAmount(
  amount: number,
  variant: "currency" | "signed",
  currency: CurrencyCode,
): string {
  const compact = formatCompactCurrency(amount, { currency })

  if (variant === "signed" && amount >= 0) {
    return `+${compact}`
  }

  return compact
}

export function MoneyAmount({
  amount,
  variant = "currency",
  currency: currencyProp,
  forceDecimals,
  className,
  expandedClassName,
}: MoneyAmountProps) {
  const {
    state: {
      preferences: { default_currency },
    },
  } = useFinance()
  const currency = currencyProp ?? default_currency
  const [isRevealed, setIsRevealed] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const fullAmount = formatFullAmount(amount, variant, currency, forceDecimals)
  const shouldCompact = Math.abs(amount) >= COMPACT_THRESHOLD
  const restingAmount = shouldCompact
    ? formatCompactAmount(amount, variant, currency)
    : fullAmount

  const amountClassName = cn("tabular-nums tracking-tighter", className)

  if (!shouldCompact) {
    return (
      <PrivacyValue
        className={amountClassName}
        hiddenLabel={getHiddenAmountAriaLabel()}
        placeholder={restingAmount}
      >
        {fullAmount}
      </PrivacyValue>
    )
  }

  return (
    <PrivacyValue
      className={amountClassName}
      hiddenLabel={getHiddenAmountAriaLabel()}
      placeholder={restingAmount}
    >
      <span
        className="focus-visible:ring-ring/50 relative inline-grid max-w-full rounded-md outline-none focus-visible:ring-[3px]"
        aria-label={fullAmount}
        onBlur={() => setIsRevealed(false)}
        onFocus={() => setIsRevealed(true)}
        onPointerEnter={() => setIsRevealed(true)}
        onPointerLeave={() => setIsRevealed(false)}
        tabIndex={0}
      >
        <span aria-hidden className="invisible col-start-1 row-start-1">
          {restingAmount}
        </span>
        <AnimatePresence initial={false} mode="popLayout">
          {isRevealed ? (
            <motion.span
              key="full"
              aria-hidden
              className={cn(
                "bg-card text-foreground absolute top-0 left-0 z-20 whitespace-nowrap",
                expandedClassName,
              )}
              initial={
                shouldReduceMotion ? false : { opacity: 0, filter: "blur(2px)" }
              }
              animate={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, filter: "blur(0px)" }
              }
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, filter: "blur(2px)" }
              }
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            >
              {fullAmount}
            </motion.span>
          ) : (
            <motion.span
              key="compact"
              aria-hidden
              className="col-start-1 row-start-1 whitespace-nowrap"
              initial={
                shouldReduceMotion ? false : { opacity: 0, filter: "blur(2px)" }
              }
              animate={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, filter: "blur(0px)" }
              }
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, filter: "blur(2px)" }
              }
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            >
              {restingAmount}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </PrivacyValue>
  )
}
