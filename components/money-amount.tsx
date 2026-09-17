"use client"

import { useState } from "react"
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
import { TextMorph } from "torph/react"

const COMPACT_THRESHOLD = 100_000

interface MoneyAmountProps {
  amount: number
  variant?: "currency" | "signed"
  currency?: CurrencyCode
  forceDecimals?: boolean
  className?: string
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
}: MoneyAmountProps) {
  const {
    state: {
      preferences: { default_currency },
    },
  } = useFinance()
  const currency = currencyProp ?? default_currency
  const [isRevealed, setIsRevealed] = useState(false)
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
        <TextMorph>{isRevealed ? fullAmount : restingAmount}</TextMorph>
      </span>
    </PrivacyValue>
  )
}
