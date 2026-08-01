"use client"

import { formatCurrency } from "@/lib/format"
import { getHiddenAmountAriaLabel } from "@/lib/finance/ui-preferences"
import { useFinance } from "@/hooks/use-finance"
import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

interface CreditUtilizationBarProps {
  creditLimit: number
  totalPendingAmount: number
  reservedInstallmentAmount: number
  color: ThemeColor
}

export function CreditUtilizationBar({
  creditLimit,
  totalPendingAmount,
  reservedInstallmentAmount,
  color,
}: CreditUtilizationBarProps) {
  const {
    state: {
      preferences: { hideAmounts },
    },
  } = useFinance()
  const usableLimit = Math.max(creditLimit, 0)
  const pendingSegment = Math.min(Math.max(totalPendingAmount, 0), usableLimit)
  const reservedSegment = Math.min(
    Math.max(reservedInstallmentAmount, 0),
    Math.max(usableLimit - pendingSegment, 0),
  )
  const utilizedCredit = totalPendingAmount + reservedInstallmentAmount
  const availableCredit = creditLimit - utilizedCredit
  const pendingWidth =
    usableLimit > 0 ? (pendingSegment / usableLimit) * 100 : 0
  const reservedWidth =
    usableLimit > 0 ? (reservedSegment / usableLimit) * 100 : 0
  const ariaValueText = hideAmounts
    ? getHiddenAmountAriaLabel()
    : `Total pending ${formatCurrency(totalPendingAmount, {
        forceDecimals: true,
      })}, reserved installments ${formatCurrency(reservedInstallmentAmount, {
        forceDecimals: true,
      })}, available credit ${formatCurrency(availableCredit, {
        forceDecimals: true,
      })}.`

  return (
    <div
      className="bg-background flex h-8 w-full overflow-hidden rounded-sm p-1"
      role="progressbar"
      aria-label="Credit utilization"
      aria-valuemin={0}
      aria-valuemax={usableLimit}
      aria-valuenow={Math.min(Math.max(utilizedCredit, 0), usableLimit)}
      aria-valuetext={ariaValueText}
    >
      <div
        aria-hidden="true"
        className={cn(
          "h-full rounded-l-sm",
          reservedWidth === 0 && "rounded-r-sm",
          themeColorClasses[color].bg,
        )}
        style={{ width: `${pendingWidth}%` }}
      />
      <div
        aria-hidden="true"
        className={cn(
          "bg-muted-foreground/35 h-full rounded-r-sm",
          pendingWidth === 0 && "rounded-l-sm",
        )}
        style={{ width: `${reservedWidth}%` }}
      />
    </div>
  )
}
