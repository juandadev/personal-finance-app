"use client"

import { formatCurrency } from "@/lib/format"
import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

interface CreditUtilizationBarProps {
  creditLimit: number
  currentStatementAmount: number
  reservedInstallmentAmount: number
  color: ThemeColor
}

export function CreditUtilizationBar({
  creditLimit,
  currentStatementAmount,
  reservedInstallmentAmount,
  color,
}: CreditUtilizationBarProps) {
  const usableLimit = Math.max(creditLimit, 0)
  const statementSegment = Math.min(
    Math.max(currentStatementAmount, 0),
    usableLimit,
  )
  const reservedSegment = Math.min(
    Math.max(reservedInstallmentAmount, 0),
    Math.max(usableLimit - statementSegment, 0),
  )
  const utilizedCredit = currentStatementAmount + reservedInstallmentAmount
  const availableCredit = creditLimit - utilizedCredit
  const statementWidth =
    usableLimit > 0 ? (statementSegment / usableLimit) * 100 : 0
  const reservedWidth =
    usableLimit > 0 ? (reservedSegment / usableLimit) * 100 : 0

  return (
    <div
      className="bg-background flex h-8 w-full overflow-hidden rounded-sm p-1"
      role="progressbar"
      aria-label="Credit utilization"
      aria-valuemin={0}
      aria-valuemax={usableLimit}
      aria-valuenow={Math.min(Math.max(utilizedCredit, 0), usableLimit)}
      aria-valuetext={`Current statement ${formatCurrency(
        currentStatementAmount,
        {
          forceDecimals: true,
        },
      )}, reserved installments ${formatCurrency(reservedInstallmentAmount, {
        forceDecimals: true,
      })}, available credit ${formatCurrency(availableCredit, {
        forceDecimals: true,
      })}.`}
    >
      <div
        aria-hidden="true"
        className={cn(
          "h-full rounded-l-sm",
          reservedWidth === 0 && "rounded-r-sm",
          themeColorClasses[color].bg,
        )}
        style={{ width: `${statementWidth}%` }}
      />
      <div
        aria-hidden="true"
        className={cn(
          "bg-muted-foreground/35 h-full rounded-r-sm",
          statementWidth === 0 && "rounded-l-sm",
        )}
        style={{ width: `${reservedWidth}%` }}
      />
    </div>
  )
}
